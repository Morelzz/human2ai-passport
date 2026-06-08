// Parametri economici di Human2AI.
//
// Modello (deciso): il compratore paga un prezzo LORDO per generazione, che dipende
// dalla CATEGORIA d'uso. Human2AI trattiene una FEE di piattaforma; il resto è la
// royalty NETTA accreditata alla persona reale (ad accumulo, payout a soglia).
//
//   lordo (buyer) = fee piattaforma + netto avatar
//
// Tutti i valori sono in centesimi di euro. Sono costanti: ritoccale qui.

import type { Category } from "@/lib/types";
import { echoSurchargeCents } from "@/lib/engines/echo-cost";

// Fee di piattaforma in basis points (20% = 2000 bp).
export const PLATFORM_FEE_BPS = 2000;

// Soglia minima per richiedere il payout (50 €).
export const PAYOUT_THRESHOLD_CENTS = 5000;

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

// ── ECHO: modello "compute a parte" (deciso 2026-06-08) ────────────────────
// Il prezzo ECHO = VALORE-categoria (su cui matura la royalty 80/20 alla
// persona) + SUPPLEMENTO-compute (= costo OpenAI × markup, tutto alla
// piattaforma per coprire il conto del motore). Così la royalty resta legata
// al valore d'uso del volto, non al costo di calcolo, e la piattaforma non va
// mai sotto costo. Le tariffe del compute vivono in lib/engines/echo-cost.ts.

// Lordo (centesimi) per ECHO = valore-categoria + supplemento-compute.
export function grossForEcho(category: string | null, size?: string | null, quality?: string | null): number {
  return grossForCategory(category) + echoSurchargeCents(size, quality);
}

export interface RoyaltySplit {
  gross_cents: number; // pagato dal buyer
  fee_cents: number;   // trattenuto dalla piattaforma
  net_cents: number;   // royalty netta accreditata all'avatar
}

// Divide il lordo in fee piattaforma + netto avatar (arrotondamento a favore dell'avatar).
export function splitRoyalty(grossCents: number): RoyaltySplit {
  const fee = Math.floor((grossCents * PLATFORM_FEE_BPS) / 10000);
  return { gross_cents: grossCents, fee_cents: fee, net_cents: grossCents - fee };
}

// Breakdown ECHO con compute separato. La royalty 80/20 si applica SOLO al
// valore-categoria; il supplemento-compute va per intero alla piattaforma.
export interface EchoSplit extends RoyaltySplit {
  value_cents: number;     // valore-categoria (base della royalty)
  surcharge_cents: number; // supplemento-compute (interamente alla piattaforma)
}

export function splitEcho(category: string | null, size?: string | null, quality?: string | null): EchoSplit {
  const value = grossForCategory(category);
  const surcharge = echoSurchargeCents(size, quality);
  // Netto avatar = 80% del SOLO valore-categoria (stesso arrotondamento di splitRoyalty).
  const net = value - Math.floor((value * PLATFORM_FEE_BPS) / 10000);
  const gross = value + surcharge;
  return {
    gross_cents: gross,
    fee_cents: gross - net, // 20% del valore + tutto il supplemento → piattaforma
    net_cents: net,
    value_cents: value,
    surcharge_cents: surcharge,
  };
}

export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
