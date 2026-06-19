// Validita' del consenso di MONITORAGGIO. Funzione PURA (nessun IO, nessun Date.now
// interno: il "now" si passa), cosi e' testabile e deterministica. Regola del brief
// (A2.1): nessuno scan senza consenso attivo, non scaduto e non revocato.

export interface MonitoringConsentRow {
  scope: string | null;
  on_match: string | null;
  open_web: boolean | null;
  granted_at: string | null;   // ISO
  expires_at: string | null;   // ISO o null = nessuna scadenza
  revoked_at: string | null;   // ISO o null = non revocato
}

export type ConsentStatus = "active" | "none" | "revoked" | "expired";

// Precedenza: none -> revoked -> expired -> active. Il confine di scadenza e'
// INCLUSO (expires_at <= now significa gia' scaduto): in dubbio, NON si scansiona.
export function monitoringConsentStatus(
  consent: MonitoringConsentRow | null,
  nowIso: string,
): ConsentStatus {
  if (!consent || !consent.granted_at) return "none";
  if (consent.revoked_at) return "revoked";
  if (consent.expires_at && consent.expires_at <= nowIso) return "expired";
  return "active";
}
