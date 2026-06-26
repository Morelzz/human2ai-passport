import { createServerClient } from "@/lib/supabase";
import type { ContentScanRepository, ContentMatchRow } from "./content-scan";
import type { AllowEntry } from "./whitelist";

// Implementazione reale del ContentScanRepository su Supabase (service role).
// Riusa scan_jobs / scan_matches / scan_candidates / allowlist con le colonne
// Ward v2 (kind='content', generation_id, reputation, watermark_present,
// certificate, entry_type/value). `avatar_id` resta NOT NULL: si passa quello
// della GENERAZIONE (lo risolve la route dall'ownership), cosi' niente migrazione
// di nullabilita' e la vista-persona di fase 2 puo' aggregare per avatar.
export class SupabaseContentScanRepository implements ContentScanRepository {
  // avatarId = l'avatar della generazione scansionata (FK NOT NULL su scan_*).
  constructor(private readonly avatarId: string) {}

  async createJob(generationId: string): Promise<string> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("scan_jobs")
      .insert({
        avatar_id: this.avatarId,
        generation_id: generationId,
        kind: "content",
        status: "running",
        provider: "google-vision",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`createJob: ${error.message}`);
    return data.id as string;
  }

  async loadAllowlist(generationId: string): Promise<AllowEntry[]> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("allowlist")
      .select("entry_type, host, value")
      .eq("generation_id", generationId);
    if (error) throw new Error(`loadAllowlist: ${error.message}`);
    // Per le voci 'url' il valore confrontabile e' l'url completo (value); per le
    // 'host' e' il dominio (host). Coerente con AllowEntry usato da isWhitelisted.
    return (data ?? []).map((r) => {
      const type = (r.entry_type as "host" | "url") ?? "host";
      const value = type === "url" ? ((r.value as string | null) ?? (r.host as string)) : (r.host as string);
      return { type, value };
    });
  }

  async insertCandidate(jobId: string, sourceUrl: string, phash: string | null): Promise<string> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("scan_candidates")
      .insert({ scan_job_id: jobId, source_url: sourceUrl, phash, status: "pending" })
      .select("id")
      .single();
    if (error) throw new Error(`insertCandidate: ${error.message}`);
    return data.id as string;
  }

  async deleteCandidate(candidateId: string): Promise<void> {
    const admin = createServerClient();
    const { error } = await admin.from("scan_candidates").delete().eq("id", candidateId);
    if (error) throw new Error(`deleteCandidate: ${error.message}`);
  }

  async insertMatch(row: ContentMatchRow): Promise<string> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("scan_matches")
      .insert({
        avatar_id: this.avatarId,
        scan_job_id: row.scanJobId,
        source_url: row.sourceUrl,
        page_url: row.pageUrl,
        host: row.host,
        band: row.band,
        reputation: row.reputation,
        watermark_present: row.watermarkPresent,
        certificate: row.certificate,
        phash: row.phash,
      })
      .select("id")
      .single();
    if (error) throw new Error(`insertMatch: ${error.message}`);
    return data.id as string;
  }

  async finishJob(
    jobId: string,
    status: "done" | "error",
    stats: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const admin = createServerClient();
    const { error: e } = await admin
      .from("scan_jobs")
      .update({ status, stats, error: error ?? null, finished_at: new Date().toISOString() })
      .eq("id", jobId);
    if (e) throw new Error(`finishJob: ${e.message}`);
  }
}
