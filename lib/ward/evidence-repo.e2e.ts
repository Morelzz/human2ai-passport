import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { SupabaseEvidenceStorage, SupabaseEvidenceRepo } from "./evidence-repo";

// Smoke dei repo evidenze contro lo schema reale: crea un job + match parent,
// carica un file nel bucket ward-evidence, inserisce evidence_records, verifica,
// poi PULISCE tutto (incluso il file). Si auto-salta senza credenziali.

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

describe.skipIf(!ready)("SupabaseEvidence* (schema reale, con cleanup)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  let avatarId = "";
  let jobId = "";
  let matchId = "";
  let filePath = "";

  beforeAll(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(SB_URL!, SB_KEY!);
    const { data: av } = await admin.from("avatars").select("id").limit(1).maybeSingle();
    avatarId = av?.id ?? "";
    if (!avatarId) return;
    const { data: job } = await admin
      .from("scan_jobs")
      .insert({ avatar_id: avatarId, status: "running", provider: "e2e-smoke" })
      .select("id")
      .single();
    jobId = job.id;
    const { data: match } = await admin
      .from("scan_matches")
      .insert({ avatar_id: avatarId, scan_job_id: jobId, source_url: "https://example.test/e.jpg", host: "example.test", band: "confirmed", sensitivity: "standard", score: 90 })
      .select("id")
      .single();
    matchId = match.id;
    filePath = `${matchId}/screenshot.png`;
  });

  afterAll(async () => {
    if (!admin) return;
    if (filePath) await admin.storage.from("ward-evidence").remove([filePath, `${matchId}/page.html`]);
    if (matchId) await admin.from("evidence_records").delete().eq("scan_match_id", matchId);
    if (jobId) {
      await admin.from("scan_matches").delete().eq("scan_job_id", jobId);
      await admin.from("scan_jobs").delete().eq("id", jobId);
    }
  });

  it("upload nel bucket + insert evidence_records sullo schema reale", async () => {
    expect(matchId).toBeTruthy();
    const storage = new SupabaseEvidenceStorage();
    const repo = new SupabaseEvidenceRepo();

    const savedPath = await storage.put(filePath, new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png");
    expect(savedPath).toBe(`ward-evidence/${filePath}`);

    const evId = await repo.insert({
      scanMatchId: matchId,
      screenshotPath: savedPath,
      htmlPath: `ward-evidence/${matchId}/page.html`,
      whois: { domain: "example.test", registrar: "Test LLC", created: null, expires: null, nameservers: [], status: [], source: "rdap" },
      hash: "0".repeat(64),
    });
    expect(evId).toBeTruthy();

    const { data: rec } = await admin.from("evidence_records").select("scan_match_id, screenshot_path, hash").eq("id", evId).single();
    expect(rec.scan_match_id).toBe(matchId);
    expect(rec.screenshot_path).toBe(savedPath);
  });
});
