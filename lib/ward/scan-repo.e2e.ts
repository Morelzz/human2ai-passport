import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { SupabaseScanRepository } from "./scan-repo";
import type { ScanMatchRow } from "./scan";

// Smoke del repo REALE contro lo schema live (RLS/constraint/FK): crea un job,
// inserisce e cancella un candidato, inserisce un match, chiude il job, verifica
// a terra, poi PULISCE tutto. Footprint minimo e identificabile (provider
// "e2e-smoke"). Si auto-salta senza credenziali. Niente face-api (solo DB).

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvLocal();

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = !!SB_URL && !!SB_KEY;

describe.skipIf(!ready)("SupabaseScanRepository (schema reale, con cleanup)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  let avatarId = "";
  let jobId = "";

  beforeAll(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(SB_URL!, SB_KEY!);
    const { data } = await admin.from("avatars").select("id").limit(1).maybeSingle();
    avatarId = data?.id ?? "";
  });

  afterAll(async () => {
    if (admin && jobId) {
      await admin.from("scan_matches").delete().eq("scan_job_id", jobId);
      await admin.from("scan_candidates").delete().eq("scan_job_id", jobId);
      await admin.from("scan_jobs").delete().eq("id", jobId);
    }
  });

  it("createJob/insertCandidate/deleteCandidate/insertMatch/finishJob sullo schema reale", async () => {
    expect(avatarId).toBeTruthy();
    const repo = new SupabaseScanRepository();

    jobId = await repo.createJob(avatarId, "e2e-smoke");
    expect(jobId).toBeTruthy();

    const candId = await repo.insertCandidate(jobId, "https://example.test/smoke.jpg", null);
    expect(candId).toBeTruthy();
    await repo.deleteCandidate(candId);

    const row: ScanMatchRow = {
      avatarId,
      scanJobId: jobId,
      sourceUrl: "https://example.test/smoke.jpg",
      host: "example.test",
      score: 95,
      band: "confirmed",
      sensitivity: "standard",
      phash: null,
    };
    const matchId = await repo.insertMatch(row);
    expect(matchId).toBeTruthy();

    await repo.finishJob(jobId, "done", { candidates: 1, matches: 1, discarded: 0 });

    // Verifica a terra: job done, nessun candidato residuo, loadRef ritorna un array.
    const { data: job } = await admin.from("scan_jobs").select("status, stats").eq("id", jobId).single();
    expect(job.status).toBe("done");
    const { count: candLeft } = await admin
      .from("scan_candidates")
      .select("id", { count: "exact", head: true })
      .eq("scan_job_id", jobId);
    expect(candLeft).toBe(0);
    const refs = await repo.loadReferenceDescriptors(avatarId);
    expect(Array.isArray(refs)).toBe(true);
  });
});
