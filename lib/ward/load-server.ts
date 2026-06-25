import { createServerClient } from "@/lib/supabase";
import { monitoringConsentStatus } from "./consent";
import { buildWardData, type WardLoadInput } from "./load";
import type { WardData } from "../../app/ward/demo";

// Carica la WardData REALE per l'utente: trova il suo avatar (preferendo quello
// in protezione), legge consenso/job/match/nemesis/evidenze (service role: le
// tabelle scan_* sono service-only, l'ownership la garantisce il filtro owner_id)
// e li passa al mapper puro. Ritorna null se l'utente non ha avatar -> la pagina
// fa fallback alla demo.
export async function loadWardData(userId: string): Promise<{ data: WardData; avatarId: string } | null> {
  const admin = createServerClient();

  const { data: avatars } = await admin
    .from("avatars")
    .select("id, handle, protection_only, created_at")
    .eq("owner_id", userId)
    .order("protection_only", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  const avatar = avatars?.[0];
  if (!avatar) return null;
  const avatarId = avatar.id as string;

  const [consentRes, jobsRes, matchesRes] = await Promise.all([
    admin
      .from("monitoring_consents")
      .select("scope, on_match, open_web, granted_at, expires_at, revoked_at")
      .eq("avatar_id", avatarId)
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("scan_jobs")
      .select("finished_at, stats")
      .eq("avatar_id", avatarId)
      .order("finished_at", { ascending: false })
      .limit(20),
    admin
      .from("scan_matches")
      .select("id, source_url, page_url, host, score, band, sensitivity, phash, ai_verdict, created_at")
      .eq("avatar_id", avatarId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const matchRows = matchesRes.data ?? [];
  const matchIds = matchRows.map((m: { id: string }) => m.id);

  let nemesis: WardLoadInput["nemesis"] = [];
  let evidence: WardLoadInput["evidence"] = [];
  if (matchIds.length) {
    const [nemRes, evRes] = await Promise.all([
      admin.from("nemesis_actions").select("id, scan_match_id, kind, status").in("scan_match_id", matchIds),
      admin
        .from("evidence_records")
        .select("id, scan_match_id, hash, anchored_at, created_at, whois")
        .in("scan_match_id", matchIds),
    ]);
    nemesis = (nemRes.data ?? []) as WardLoadInput["nemesis"];
    evidence = (evRes.data ?? []) as WardLoadInput["evidence"];
  }

  const consentStatus = monitoringConsentStatus(consentRes.data ?? null, new Date().toISOString());

  const input: WardLoadInput = {
    avatar: { id: avatarId, handle: avatar.handle as string },
    consentStatus,
    jobs: (jobsRes.data ?? []) as WardLoadInput["jobs"],
    matches: matchRows as WardLoadInput["matches"],
    nemesis,
    evidence,
    nowIso: new Date().toISOString(),
  };
  return { data: buildWardData(input), avatarId };
}
