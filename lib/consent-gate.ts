// ──────────────────────────────────────────────────────────────────────────
// A2 — Gate di consenso PROSPETTICO per la generazione asincrona. La revoca (o
// il ritiro dell'uso commerciale, o il passaggio a sola-protezione) puo arrivare
// DOPO che il job e gia in coda. Prima di spendere il motore, il worker rilegge
// lo stato VIVO dell'avatar e usa questa funzione PURA per decidere se annullare.
// Nessun IO qui: logica pura e testabile. Guardrail 2 (CLAUDE.md): la revoca
// blocca il futuro, sempre, anche un job gia accodato.
// ──────────────────────────────────────────────────────────────────────────

export interface LiveConsentState {
  revoked_at: string | null;
  commercial_consent: boolean | null;
  protection_only: boolean | null;
}

// Ritorna il MOTIVO del blocco (stringa mostrabile all'utente) oppure null = via
// libera. Fail-closed: qualunque stato che non sia "attivo e commerciale" annulla.
export function consentBlockReason(live: LiveConsentState | null): string | null {
  if (!live) return "Avatar non trovato: generazione annullata.";
  if (live.revoked_at) return "Consenso revocato dopo la richiesta: generazione annullata, nessun costo a tuo carico.";
  if (live.protection_only) return "Volto in sola protezione: generazione annullata.";
  if (live.commercial_consent === false) return "Uso commerciale non più consentito: generazione annullata, nessun costo a tuo carico.";
  return null;
}
