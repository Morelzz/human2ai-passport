import { createServerClient } from "@/lib/supabase";
import type { ScanRepository, ScanMatchRow } from "./scan";

// Implementazione reale del ScanRepository su Supabase (service role). Le tabelle
// scan_* sono service-only (RLS owner-scoped/service): qui si usa SEMPRE
// createServerClient. I descrittori di riferimento si leggono dall'indice GIA'
// registrato nel bucket privato face-index (nessun re-embedding): l'avatar mappa
// al suo handle, che indicizza gli entry {handle, descriptor}.

interface IndexEntry {
  handle: string;
  descriptor: number[];
}

export class SupabaseScanRepository implements ScanRepository {
  async loadReferenceDescriptors(avatarId: string): Promise<number[][]> {
    const admin = createServerClient();
    const { data: av } = await admin.from("avatars").select("handle").eq("id", avatarId).maybeSingle();
    const handle = (av?.handle as string | undefined) ?? "";
    if (!handle) return [];

    const dl = async (p: string): Promise<{ entries?: IndexEntry[] } | null> => {
      try {
        const { data } = await admin.storage.from("face-index").download(p);
        return data ? JSON.parse(await data.text()) : null;
      } catch {
        return null;
      }
    };
    const idx = await dl("index.json");
    const protectedIdx = await dl("protected-index.json");
    const entries: IndexEntry[] = [...(idx?.entries ?? []), ...(protectedIdx?.entries ?? [])];
    return entries
      .filter((e) => e.handle === handle && Array.isArray(e.descriptor) && e.descriptor.length > 0)
      .map((e) => e.descriptor);
  }

  async createJob(avatarId: string, provider: string): Promise<string> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("scan_jobs")
      .insert({ avatar_id: avatarId, status: "running", provider, started_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw new Error(`createJob: ${error.message}`);
    return data.id as string;
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

  async insertMatch(row: ScanMatchRow): Promise<string> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("scan_matches")
      .insert({
        avatar_id: row.avatarId,
        scan_job_id: row.scanJobId,
        source_url: row.sourceUrl,
        page_url: row.pageUrl,
        host: row.host,
        score: row.score,
        band: row.band,
        sensitivity: row.sensitivity,
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
