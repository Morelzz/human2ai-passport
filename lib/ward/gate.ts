import { createServerClient } from "@/lib/supabase";
import { monitoringConsentStatus } from "./consent";
import { appendAudit } from "./audit";

// IL GATE (brief A2.1): nessuna discovery/match parte se l'avatar non ha un
// consenso di monitoraggio ATTIVO. Server-only (service role). Logga SEMPRE
// l'esito nell'audit. Nessun bypass flag. Prende l'ultimo consenso per avatar.
export type GateResult =
  | { ok: true; consentId: string; onMatch: "notify" | "auto" }
  | { ok: false; status: "none" | "revoked" | "expired"; reason: string };

export async function assertMonitoringConsent(avatarId: string): Promise<GateResult> {
  const admin = createServerClient();
  const { data } = await admin
    .from("monitoring_consents")
    .select("id, scope, on_match, open_web, granted_at, expires_at, revoked_at")
    .eq("avatar_id", avatarId)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = monitoringConsentStatus(data ?? null, new Date().toISOString());

  if (status !== "active") {
    await appendAudit({ actor: null, action: "scan.consent_denied", target: avatarId, meta: { status } });
    return { ok: false, status, reason: `Monitoraggio non consentito (${status})` };
  }

  await appendAudit({ actor: null, action: "scan.consent_ok", target: avatarId, meta: { consentId: data!.id } });
  return { ok: true, consentId: data!.id, onMatch: (data!.on_match as "notify" | "auto") };
}
