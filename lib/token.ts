import crypto from "crypto";

// token_hash = SHA256( id + "|" + consent_start )
// Modello senza categorie (Fase 2): il consenso è sì/no, non più per-categoria,
// quindi il token verificabile lega solo l'identità dell'avatar e l'inizio del
// consenso (la sua timeline). Nessun dato biometrico, mai. NB: il token è un
// identificatore opaco verificato per lookup (/api/verify cerca token_hash), non
// ricalcolato: gli avatar già emessi restano validi con il loro hash storico.
export function computeTokenHash(id: string, consentStart: string): string {
  const payload = `${id}|${consentStart}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// Mostra solo i primi 16 caratteri all'utente
export function truncateToken(hash: string): string {
  return hash.slice(0, 16) + "…";
}

// ── M12: scadenza del token di consenso (link "persona nel loop") ────────────
// Un token di conferma valido all'infinito e un vettore: chi intercetta il link
// puo confermare al posto della persona. Gli diamo una finestra breve. Funzioni
// PURE (il tempo arriva come parametro): testabili e senza IO.
export const CONSENT_TOKEN_TTL_DAYS = 14;

export function consentTokenExpiry(fromIso: string): string {
  return new Date(new Date(fromIso).getTime() + CONSENT_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// true = scaduto. Un token SENZA scadenza viene trattato come da ri-emettere.
export function isConsentTokenExpired(expiresAtIso: string | null, nowIso: string): boolean {
  if (!expiresAtIso) return true;
  return new Date(nowIso).getTime() >= new Date(expiresAtIso).getTime();
}
