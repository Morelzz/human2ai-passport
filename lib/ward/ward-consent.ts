// Costruisce la riga monitoring_consents (spec F3). PURA: niente IO, il "now" si
// passa, cosi e' testabile e deterministica. on_match accetta solo notify|auto
// (default sicuro: notify). Lo scope del Modulo 1 e' il web aperto.
export interface MonitoringConsentInsert {
  avatar_id: string;
  scope: string;
  on_match: "notify" | "auto";
  open_web: boolean;
  granted_at: string;
  expires_at: string;
  revoked_at: null;
}

export function buildMonitoringConsent(p: {
  avatarId: string;
  onMatch: "notify" | "auto";
  months: number;
  nowIso: string;
}): MonitoringConsentInsert {
  const d = new Date(p.nowIso);
  d.setUTCMonth(d.getUTCMonth() + p.months);
  return {
    avatar_id: p.avatarId,
    scope: "open_web",
    on_match: p.onMatch === "auto" ? "auto" : "notify",
    open_web: true,
    granted_at: p.nowIso,
    expires_at: d.toISOString(),
    revoked_at: null,
  };
}
