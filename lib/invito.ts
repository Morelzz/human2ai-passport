// ──────────────────────────────────────────────────────────────────────────
// INVITA UN AMICO (23/9/2026). Il passaparola e' il modo piu' onesto che
// abbiamo per crescere: chi ha provato Semblic lo spiega meglio di qualunque
// inserzione. Qui il premio e' in VOLT, mai in contanti, e arriva SOLO quando
// entrano soldi veri (una ricarica), non quando si apre un account:
// altrimenti il programma pagherebbe chi crea dieci caselle di posta.
//
//  · chi invita prende il 20% di ogni ricarica dell'invitato, in VOLT, per 12 mesi;
//  · l'invitato prende il 10% in piu' sulla SUA PRIMA ricarica.
//
// Costa poco e non costa contanti: un VOLT e' un centesimo di listino, e il
// listino e' gia' costo piu' ricarico (lib/wallet). Regalare VOLT vuol dire
// regalare il ricarico, non il conto di OpenAI.
//
// Modulo PURO: codici, premi e scadenze si provano senza rete.
// La tabella arriva da supabase/inviti.sql.
// ──────────────────────────────────────────────────────────────────────────

export const PREMIO_INVITANTE_BPS = 2000; // 20% di ogni ricarica
export const PREMIO_INVITATO_BPS = 1000; // 10% sulla prima ricarica
export const MESI_VALIDI = 12;
export const TETTO_PREMIO_VOLT = 5000; // 50 euro di VOLT per singola ricarica: un freno, non un muro

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // niente I, O, 0, 1: si dettano al telefono

/** Un codice nuovo, leggibile ad alta voce. */
export function nuovoCodice(caso: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[Math.floor(caso() * ALFABETO.length) % ALFABETO.length];
  return s;
}

/** Quello che l'utente scrive o incolla: maiuscolo, senza spazi ne' trattini. */
export function codicePulito(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return t.length >= 6 ? t : null;
}

/** Il link da mandare agli amici. */
export function linkInvito(codice: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/r/${codice}`;
}

/** Fino a quando vale un invito. */
export function scadenza(da: Date, mesi = MESI_VALIDI): Date {
  const d = new Date(da);
  d.setMonth(d.getMonth() + mesi);
  return d;
}

export function ancoraValido(scade: string | Date, adesso: Date = new Date()): boolean {
  return new Date(scade).getTime() > adesso.getTime();
}

/** Il premio in VOLT su una ricarica, col suo tetto. */
export function premio(voltRicarica: number, bps: number): number {
  if (!Number.isFinite(voltRicarica) || voltRicarica <= 0) return 0;
  return Math.min(TETTO_PREMIO_VOLT, Math.floor((voltRicarica * bps) / 10000));
}

/**
 * Chi invita e chi e' invitato al momento di una ricarica. Ritorna i due
 * accrediti da fare (zero = non si fa niente).
 */
export function premiDaRicarica(
  voltRicarica: number,
  invito: { scade_il: string | Date; prima_ricarica_fatta: boolean } | null,
  adesso: Date = new Date(),
): { invitante: number; invitato: number } {
  if (!invito || !ancoraValido(invito.scade_il, adesso)) return { invitante: 0, invitato: 0 };
  return {
    invitante: premio(voltRicarica, PREMIO_INVITANTE_BPS),
    invitato: invito.prima_ricarica_fatta ? 0 : premio(voltRicarica, PREMIO_INVITATO_BPS),
  };
}
