// Quale dei miei volti sorveglia Ward (23/9/2026). Regola PURA, una sola, usata
// sia dalla rotta che accende Ward sia dalla scheda dell'account: se le due
// scegliessero volti diversi, uno accenderebbe la guardia su un volto e l'altra
// mostrerebbe lo stato di un altro.
//
// Ordine: prima chi si e' registrato in SOLA PROTEZIONE (l'ha chiesto apposta),
// poi il volto del registro che non si e' ritirato, e in ultimo quello che c'e'.

export interface VoltoMio {
  id: string;
  protection_only?: boolean | null;
  revoked_at?: string | null;
}

export function scegliVoltoDaSorvegliare<T extends VoltoMio>(lista: T[]): T | null {
  if (!lista?.length) return null;
  return lista.find((a) => a.protection_only) ?? lista.find((a) => !a.revoked_at) ?? lista[0];
}
