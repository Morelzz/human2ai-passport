import crypto from "crypto";

// token_hash = SHA256( id + "|" + consent_start + "|" + JSON(approved_categories) )
// Nessun dato biometrico — solo id e termini di consenso.
export function computeTokenHash(
  id: string,
  consentStart: string,
  approvedCategories: string[]
): string {
  const payload = `${id}|${consentStart}|${JSON.stringify(approvedCategories)}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// Mostra solo i primi 16 caratteri all'utente
export function truncateToken(hash: string): string {
  return hash.slice(0, 16) + "…";
}
