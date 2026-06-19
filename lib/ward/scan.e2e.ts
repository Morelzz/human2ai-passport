import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { runScan, type ScanRepository, type ScanMatchRow } from "./scan";
import { match } from "./matching";
import type { DiscoveryProvider } from "./discovery";

// E2E del MOTORE: gira il vero runScan con face-api node-wasm reale contro
// immagini REALI fetchabili (i reference consenzienti del registro, via signed
// URL). Prova la pipeline intera (gate -> discovery[stub] -> fetch -> embed ->
// match -> scan_matches + delete) senza scrivere su prod (repo in-memory).
// Si auto-salta senza credenziali/modelli.

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
const MODELS = path.join(process.cwd(), "public", "models");
const ready = !!SB_URL && !!SB_KEY && existsSync(path.join(MODELS, "face_recognition_model.bin"));

function memRepo(refs: number[][]) {
  const candidates = new Map<string, string>();
  const matches: ScanMatchRow[] = [];
  let seq = 0;
  const repo: ScanRepository = {
    async loadReferenceDescriptors() { return refs; },
    async createJob() { return "job-e2e"; },
    async insertCandidate(_j, url) { const id = "c" + ++seq; candidates.set(id, url); return id; },
    async deleteCandidate(id) { candidates.delete(id); },
    async insertMatch(row) { matches.push(row); return "m" + ++seq; },
    async finishJob() {},
  };
  return { repo, candidates, matches };
}

// fetch reale ma lenient sul content-type (lo storage non sempre lo setta su image/*)
const fetchImage = async (url: string): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
};

describe.skipIf(!ready)("runScan e2e (face-api reale, immagini reali via signed URL)", () => {
  let refs: number[][] = [];
  let selfUrl = "";
  let otherUrl = "";

  beforeAll(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(SB_URL!, SB_KEY!);

    const dl = async (p: string) => {
      try {
        const { data } = await sb.storage.from("face-index").download(p);
        return data ? JSON.parse(await data.text()) : null;
      } catch {
        return null;
      }
    };
    const index = (await dl("index.json")) || (await dl("protected-index.json"));
    const entries: { handle: string; descriptor: number[] }[] = index?.entries ?? [];
    const handles = [...new Set(entries.map((e) => e.handle))];
    const handle = handles[0];
    refs = entries.filter((e) => e.handle === handle).map((e) => e.descriptor);

    const signedRef = async (h: string): Promise<string> => {
      const { data: files } = await sb.storage.from("references").list(h);
      const img = (files || []).find((f: { name: string }) => /\.(jpg|jpeg|png|webp)$/i.test(f.name));
      if (!img) return "";
      const { data } = await sb.storage.from("references").createSignedUrl(`${h}/${img.name}`, 120);
      return data?.signedUrl ?? "";
    };
    if (handle) selfUrl = await signedRef(handle);
    if (handles[1]) otherUrl = await signedRef(handles[1]);
  });

  it("self-match -> salvato; persona diversa -> scartata; zero candidati residui", async () => {
    expect(refs.length).toBeGreaterThan(0);
    expect(selfUrl).toBeTruthy();

    const urls = otherUrl ? [selfUrl, otherUrl] : [selfUrl];
    const provider: DiscoveryProvider = {
      name: "e2e-stub",
      enabled: true,
      async find(_q, limit) {
        return urls.slice(0, limit).map((url) => ({ url, host: new URL(url).host }));
      },
    };

    const m = memRepo(refs);
    const res = await runScan("av-e2e", {
      repo: m.repo,
      gate: async () => ({ ok: true, consentId: "k", onMatch: "notify" }),
      audit: async () => {},
      discovery: provider,
      fetchImage,
      match, // REALE: face-api node-wasm + sharp
    });

    console.log("E2E result:", JSON.stringify(res));
    console.log("E2E matches:", JSON.stringify(m.matches.map((x) => ({ url: x.sourceUrl === selfUrl ? "self" : "other", band: x.band, score: x.score }))));

    expect(res.ok).toBe(true);
    expect(res.matches).toBeGreaterThanOrEqual(1);
    expect(m.matches.some((x) => x.sourceUrl === selfUrl)).toBe(true); // il self e' un match
    expect(m.candidates.size).toBe(0);                                  // data-minimization
    if (otherUrl) expect(m.matches.some((x) => x.sourceUrl === otherUrl)).toBe(false); // diverso scartato
  });
});
