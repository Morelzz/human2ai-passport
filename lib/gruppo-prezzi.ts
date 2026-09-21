// Scene di gruppo: prezzo e divisione della royalty. Modulo PURO (niente rete,
// niente face-api): lo usano il server che fa pagare e la pagina che mostra il
// prezzo prima di spendere.
//
// Prezzo (21/9/2026): una scena di gruppo costa come DUE scatti, per qualunque
// numero di persone. Il motore fa una scena sola e, se la misura lo chiede, uno
// o due ritocchi mirati: prima si pagavano N+1 scatti perche' si rifacevano
// tutti i volti a tappeto, un metodo abbandonato (peggiorava le foto).
// La parte delle persone (45% del ricarico, come sempre) si divide in parti uguali.

export const MAX_PERSONE_GRUPPO = 4;

export interface SplitScatto { gross_cents: number; fee_cents: number; net_cents: number; surcharge_cents: number }
export interface PrezzoGruppo { gross_cents: number; fee_cents: number; royalty_cents: number; surcharge_cents: number; quote: number[] }

export function scattiPerGruppo(_n: number): number {
  return 2;
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
