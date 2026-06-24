// lib/adult-gate.ts
// Gate 18+ a valle: chi compie un'azione sensibile (generazione, ecc.) deve
// risultare adulto verificato. Funzione PURA, fail-closed. Si appoggia
// principalmente a adult_verified_at (valorizzato sia dall'autodichiarazione al
// signup, metodo 'self', sia dall'approvazione Didit, metodo 'document'); la
// data di nascita resta come controllo difensivo.

import { isAdult } from "./age";

export interface AdultGateState {
  date_of_birth: string | null;
  adult_verified_at: string | null;
}

export type AdultGateReason = "no_dob" | "under_18";

// null = via libera. "no_dob" = account pre-gate da far passare dal prompt
// una-tantum. "under_18" = minorenne, blocco secco.
export function adultGateReason(profile: AdultGateState | null, now: Date): AdultGateReason | null {
  if (!profile) return "no_dob";
  if (profile.adult_verified_at) return null;
  if (!profile.date_of_birth) return "no_dob";
  return isAdult(profile.date_of_birth, now) ? null : "under_18";
}
