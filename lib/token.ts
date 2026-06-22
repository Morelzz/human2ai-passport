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
