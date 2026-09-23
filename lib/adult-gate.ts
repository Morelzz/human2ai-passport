// lib/adult-gate.ts
// Gate 18+ a valle: chi compie un'azione sensibile (generazione, ecc.) deve
// risultare adulto verificato. Funzione PURA, fail-closed.
//
// DECIDE LA DATA DI NASCITA, SEMPRE (23/9/2026). Prima bastava che
// adult_verified_at fosse compilato, anche con una data di nascita da
// quindicenne; e quella colonna, fino al lock SQL di oggi, l'utente la poteva
// scrivere da solo col suo accesso al database. Adesso il timbro da solo non
// apre niente: la data si legge e si controlla ogni volta. Chi e' verificato
// col documento la data ce l'ha (la salva il webhook Didit); chi non ce l'ha
// risponde una volta sola al prompt, che la valida. Contati il 23/9: nessuna
// persona vera dipendeva dal solo timbro.

import { isAdult } from "./age";

export interface AdultGateState {
  date_of_birth: string | null;
  adult_verified_at: string | null;
}

export type AdultGateReason = "no_dob" | "under_18";

// null = via libera. "no_dob" = account pre-gate da far passare dal prompt
// una-tantum. "under_18" = minorenne, blocco secco.
export function adultGateReason(profile: AdultGateState | null, now: Date): AdultGateReason | null {
  if (!profile || !profile.date_of_birth) return "no_dob";
  return isAdult(profile.date_of_birth, now) ? null : "under_18";
}
