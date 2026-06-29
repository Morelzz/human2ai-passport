// Parametri economici di Semblic.
//
// Modello (deciso): il compratore paga un prezzo LORDO per generazione, che dipende
// dalla CATEGORIA d'uso. Semblic trattiene una FEE di piattaforma; il resto è la
// royalty NETTA accreditata alla persona reale (ad accumulo, payout a soglia).
//
//   lordo (buyer) = fee piattaforma + netto avatar
//
// Tutti i valori sono in centesimi di euro. Sono costanti: ritoccale qui.

import type { Category } from "@/lib/types";
import { estEchoCostCents } from "@/lib/engines/echo-cost";

// Fee di piattaforma in basis points (20% = 2000 bp). Usata solo dal vecchio
// split classico (ramo Higgsfield dormiente); il modello ECHO vivo e' cost-plus.
export const PLATFORM_FEE_BPS = 2000;

// Soglia minima per richiedere il payout (50 €).
export const PAYOUT_THRESHOLD_CENTS = 5000;

// A1 (fail-closed): esiste un provider di payout REALE? Finche no, il payout e
// un no-op che NON tocca il saldo: azzerare royalty senza pagare distruggerebbe
// un credito dovuto alla persona. Si accende solo con un provider vero (Stripe
// Connect), segnalato da una env esplicita: nessun default permissivo.
export function payoutProviderConfigured(): boolean {
  return process.env.PAYOUT_PROVIDER === "stripe";
}

// Bande di prezzo (LORDO pagato dal buyer, in centesimi).
export type PriceBand = "premium" | "standard" | "base";

// Prezzi per generazione (provvisori, volutamente bassi: gen reale ~0,06 €,
// quindi margine ampio). Da rivedere a regime. Base 0,30 € → Premium 1,00 €.
export const BAND_PRICE_CENTS: Record<PriceBand, number> = {
  premium: 100, // 1,00 €
  standard: 60, // 0,60 €
  base: 30,     // 0,30 €
};

// Mappa categoria -> banda. Le categorie non mappate ricadono su "base".
const CATEGORY_BAND: Record<Category, PriceBand> = {
  Luxury: "premium",
  Fashion: "premium",
  Beauty: "premium",
  Business: "standard",
  Travel: "standard",
  Entertainment: "standard",
  Sport: "standard",
  Alcohol: "standard",
  Food: "base",
  Lifestyle: "base",
  Healthcare: "base",
  Politics: "base",
};

// Banda di prezzo per una categoria (null/sconosciuta -> "base").
export function bandForCategory(category: string | null): PriceBand {
  if (category && category in CATEGORY_BAND) {
    return CATEGORY_BAND[category as Category];
  }
  return "base";
}

// Prezzo LORDO (in centesimi) per una categoria d'uso.
export function grossForCategory(category: string | null): number {
  return BAND_PRICE_CENTS[bandForCategory(category)];
}

export interface RoyaltySplit {
  gross_cents: number; // pagato dal buyer
  fee_cents: number;   // trattenuto dalla piattaforma
  net_cents: number;   // royalty netta accreditata all'avatar
}

// Divide il lordo in fee piattaforma + netto avatar (arrotondamento a favore
// dell'avatar). Usato dallo split classico (ramo Higgsfield dormiente).
export function splitRoyalty(grossCents: number): RoyaltySplit {
  const fee = Math.floor((grossCents * PLATFORM_FEE_BPS) / 10000);
  return { gross_cents: grossCents, fee_cents: fee, net_cents: grossCents - fee };
}

// ── ECHO: prezzo COST-PLUS (deciso 2026-06-29) ─────────────────────────────
// OpenAI (gpt-image-2) e' il FORNITORE: il suo costo e' il nostro costo vivo.
//   prezzo buyer = costo OpenAI + RICARICO
// Il ricarico si divide tra piattaforma (55%) e avatar (45%): guadagniamo
// entrambi, in modo equilibrato, e il costo del motore e' puro pass-through
// (la piattaforma non va mai sotto fornitore). Tetto massimo €2 a generazione.
// Il ricarico in % OSCILLA: alto sulle modalita' economiche (dove in centesimi
// e' poco), basso sul 4K (dove l'assoluto e' gia' alto). Il costo reale vive in
// lib/engines/echo-cost.ts (stima pre-call + verifica dai token loggati).

export const PRICE_CAP_CENTS = 200;     // tetto €2 a generazione
export const AVATAR_MARKUP_BPS = 4500;  // 45% del ricarico va all'avatar

// Ricarico a scaglioni sul costo OpenAI (centesimi).
export function echoMarkupMultiplier(costCents: number): number {
  if (costCents <= 10) return 3;   // fino a €0,10 -> ×3
  if (costCents <= 50) return 2;   // fino a €0,50 -> ×2
  return 1.5;                       // oltre        -> ×1,5
}

// Prezzo buyer (centesimi) per una modalita' (size/quality), col tetto €2.
export function priceForEcho(size?: string | null, quality?: string | null): number {
  const cost = Math.round(estEchoCostCents(size, quality));
  const raw = Math.ceil(cost * echoMarkupMultiplier(cost));
  return Math.min(raw, PRICE_CAP_CENTS);
}

// Compat: il prezzo ECHO ora NON dipende dalla categoria (cost-plus puro). La
// firma resta per i chiamanti (MatchClient/route); `category` e' ignorata.
export function grossForEcho(_category: string | null, size?: string | null, quality?: string | null): number {
  return priceForEcho(size, quality);
}

export interface EchoSplit extends RoyaltySplit {
  cost_cents: number;      // costo OpenAI (compute), pass-through
  markup_cents: number;    // ricarico = prezzo - costo
  // Alias retro-compatibili coi chiamanti esistenti (route.ts):
  value_cents: number;     // = ricarico (la base che si divide 55/45)
  surcharge_cents: number; // = costo OpenAI (compute)
}

// Split ECHO cost-plus. fee_cents = quanto trattiene la piattaforma (55% del
// ricarico + il costo OpenAI, da cui paga il fornitore); net_cents = royalty
// all'avatar (45% del ricarico). Invarianti: gross = fee + net = costo + ricarico.
export function splitEcho(_category: string | null, size?: string | null, quality?: string | null): EchoSplit {
  const cost = Math.round(estEchoCostCents(size, quality));
  const gross = priceForEcho(size, quality);
  const markup = Math.max(0, gross - cost);
  const net = Math.round((markup * AVATAR_MARKUP_BPS) / 10000); // 45% all'avatar
  const fee = gross - net;
  return {
    gross_cents: gross,
    fee_cents: fee,
    net_cents: net,
    cost_cents: cost,
    markup_cents: markup,
    value_cents: markup,
    surcharge_cents: cost,
  };
}

export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
