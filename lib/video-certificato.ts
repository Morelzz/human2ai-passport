import type { createServerClient } from "@/lib/supabase";

type Admin = ReturnType<typeof createServerClient>;

// Il certificato di un video Anima: da dove nasce (lo scatto certificato di
// partenza) e quando. Tabella assente (anima_video.sql) o nessun video = null.
export interface OrigineVideo { certificate: string; created_at: string; seconds: number; sourceCertificate: string; identityScore: number | null }

export async function origineVideo(admin: Admin, cert: string): Promise<OrigineVideo | null> {
  const { data: v, error } = await admin
    .from("animations")
    .select("*")
    .eq("certificate", cert)
    .eq("status", "done")
    .maybeSingle();
  if (error || !v) return null;
  const { data: g } = await admin.from("generations").select("certificate").eq("id", v.source_generation_id).maybeSingle();
  if (!g?.certificate) return null;
  return {
    certificate: cert,
    created_at: String(v.finished_at ?? v.created_at),
    seconds: Number(v.seconds ?? 0),
    sourceCertificate: String(g.certificate),
    identityScore: typeof v.identity_score === "number" ? v.identity_score : null,
  };
}
