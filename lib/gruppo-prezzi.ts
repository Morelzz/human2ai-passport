// Scene di gruppo: prezzo e divisione della royalty. Modulo PURO (niente rete,
// niente face-api): lo usano il server che fa pagare e la pagina che mostra il
// prezzo prima di spendere.
//
// PROPOSTA da confermare con Morelz: una scena con N persone costa N+1 scatti
// (la scena + un passaggio per ogni volto), quindi prezzo, costo e ricarico
// di uno scatto singolo per N+1. La parte delle persone (45% del ricarico,
// come sempre) si divide in parti uguali fra i protagonisti.

export const MAX_PERSONE_GRUPPO = 4;

export interface SplitScatto { gross_cents: number; fee_cents: number; net_cents: number; surcharge_cents: number }
export interface PrezzoGruppo { gross_cents: number; fee_cents: number; royalty_cents: number; surcharge_cents: number; quote: number[] }

export function scattiPerGruppo(n: number): number {
  return n + 1;
}

// Royalty in parti uguali; il resto (centesimi) al primo protagonista.
export function dividiRoyalty(totale: number, n: number): number[] {
  const base = Math.floor(totale / n);
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? totale - base * n : 0));
}

export function prezzoGruppo(s: SplitScatto, n: number): PrezzoGruppo {
  const m = scattiPerGruppo(n);
  const gross = s.gross_cents * m;
  const royalty = s.net_cents * m;
  return { gross_cents: gross, fee_cents: gross - royalty, royalty_cents: royalty, surcharge_cents: s.surcharge_cents * m, quote: dividiRoyalty(royalty, n) };
}
