import { createServerClient } from "@/lib/supabase";
import type { TakedownStatus } from "./takedown";

// Impl Supabase (service role) per Nemesis: profilo del richiedente (tabella nuova
// takedown_profile) e ciclo di vita delle azioni (riusa nemesis_actions). Niente
// logica di dominio qui: solo persistenza.

export interface TakedownProfile { fullName: string; address: string; email: string; }

export async function getProfile(userId: string): Promise<TakedownProfile | null> {
  const admin = createServerClient();
  const { data } = await admin.from("takedown_profile").select("full_name, address, email").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { fullName: data.full_name as string, address: data.address as string, email: data.email as string };
}

export async function upsertProfile(userId: string, p: TakedownProfile): Promise<void> {
  const admin = createServerClient();
  const { error } = await admin.from("takedown_profile").upsert(
    { user_id: userId, full_name: p.fullName, address: p.address, email: p.email, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`upsertProfile: ${error.message}`);
}

export async function createAction(scanMatchId: string): Promise<{ id: string; status: TakedownStatus }> {
  const admin = createServerClient();
  const { data, error } = await admin.from("nemesis_actions")
    .insert({ scan_match_id: scanMatchId, kind: "dmca", status: "drafted" }).select("id, status").single();
  if (error) throw new Error(`createAction: ${error.message}`);
  return { id: data.id as string, status: data.status as TakedownStatus };
}

export async function getAction(actionId: string): Promise<{ id: string; scanMatchId: string; status: TakedownStatus } | null> {
  const admin = createServerClient();
  const { data } = await admin.from("nemesis_actions").select("id, scan_match_id, status").eq("id", actionId).maybeSingle();
  if (!data) return null;
  return { id: data.id as string, scanMatchId: data.scan_match_id as string, status: data.status as TakedownStatus };
}

export async function updateActionStatus(actionId: string, status: TakedownStatus): Promise<void> {
  const admin = createServerClient();
  const { error } = await admin.from("nemesis_actions").update({ status, updated_at: new Date().toISOString() }).eq("id", actionId);
  if (error) throw new Error(`updateActionStatus: ${error.message}`);
}

export interface MatchOwner {
  buyerId: string; band: string; sensitivity: string;
  host: string | null; sourceUrl: string; pageUrl: string | null;
  certificate: string | null; phash: string | null;
  alias: string; generatedAt: string | null;
}

// Risolve proprieta' e dati di un match Ward v2: match -> avatar (alias/opera) e
// match -> job -> generation (buyer = proprietario, come /api/ward/content-scan).
export async function matchOwner(scanMatchId: string): Promise<MatchOwner | null> {
  const admin = createServerClient();
  const { data: m } = await admin.from("scan_matches")
    .select("id, avatar_id, scan_job_id, band, sensitivity, host, source_url, page_url, certificate, phash")
    .eq("id", scanMatchId).maybeSingle();
  if (!m || !m.scan_job_id) return null;

  const { data: job } = await admin.from("scan_jobs").select("generation_id").eq("id", m.scan_job_id).maybeSingle();
  if (!job?.generation_id) return null;

  const { data: gen } = await admin.from("generations").select("buyer_id, created_at").eq("id", job.generation_id).maybeSingle();
  if (!gen?.buyer_id) return null;

  const { data: av } = await admin.from("avatars").select("alias").eq("id", m.avatar_id).maybeSingle();

  return {
    buyerId: gen.buyer_id as string,
    band: (m.band as string) ?? "review",
    sensitivity: (m.sensitivity as string) ?? "standard",
    host: m.host as string | null,
    sourceUrl: m.source_url as string,
    pageUrl: m.page_url as string | null,
    certificate: m.certificate as string | null,
    phash: m.phash as string | null,
    alias: (av?.alias as string | undefined) ?? "La tua immagine",
    generatedAt: (gen.created_at as string | null) ?? null,
  };
}
