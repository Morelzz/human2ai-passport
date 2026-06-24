import { describe, it, expect } from "vitest";
import { runScan, type ScanRepository, type ScanMatchRow } from "./scan";
import type { DiscoveryProvider } from "./discovery";
import type { MatchResult } from "./matching";

// Repo in-memory che traccia il ciclo di vita dei candidati (insert/delete) e i
// match salvati: cosi' verifichiamo la data-minimization senza toccare il DB.
function memRepo(refs: number[][]) {
  const candidates = new Map<string, { jobId: string; url: string }>();
  const matches: ScanMatchRow[] = [];
  const finished: { jobId: string; status: string; stats: Record<string, unknown>; error?: string }[] = [];
  let jobs = 0;
  let seq = 0;
  const repo: ScanRepository = {
    async loadReferenceDescriptors() { return refs; },
    async createJob() { jobs++; return "job-1"; },
    async insertCandidate(jobId, url) { const id = "c" + ++seq; candidates.set(id, { jobId, url }); return id; },
    async deleteCandidate(id) { candidates.delete(id); },
    async insertMatch(row) { matches.push(row); return "m" + ++seq; },
    async finishJob(jobId, status, stats, error) { finished.push({ jobId, status, stats, error }); },
  };
  return { repo, candidates, matches, finished, jobs: () => jobs };
}

const audit = async () => {};

function provider(urls: string[]) {
  let findCalled = false;
  const p: DiscoveryProvider = {
    name: "test",
    enabled: true,
    async find(_q, limit) {
      findCalled = true;
      return urls.slice(0, limit).map((url) => ({ url, host: new URL(url).host }));
    },
  };
  return { p, findCalled: () => findCalled };
}

const okGate = async () => ({ ok: true as const, consentId: "k1", onMatch: "notify" as const });

describe("runScan: gate (A2.1)", () => {
  it("non scansiona se il consenso non e' attivo", async () => {
    const m = memRepo([[0, 0]]);
    const d = provider(["https://a.test/1.jpg"]);
    const res = await runScan("av1", {
      repo: m.repo,
      audit,
      gate: async () => ({ ok: false, status: "revoked", reason: "Monitoraggio non consentito (revoked)" }),
      discovery: d.p,
      fetchImage: async () => new Uint8Array([0]),
      match: async () => ({ score: 99, band: "confirmed", distance: 0.1, faceCount: 1 }),
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe("revoked");
    expect(d.findCalled()).toBe(false); // discovery MAI chiamata se il gate nega
    expect(m.jobs()).toBe(0);           // nessun job creato
    expect(m.matches.length).toBe(0);
    expect(m.candidates.size).toBe(0);
  });
});

describe("runScan: nessun riferimento", () => {
  it("fallisce pulito e NON fa discovery se l'avatar non ha descrittori", async () => {
    const m = memRepo([]);
    const d = provider(["https://a.test/1.jpg"]);
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: d.p,
      fetchImage: async () => new Uint8Array([0]),
      match: async () => ({ score: 99, band: "confirmed", distance: 0.1, faceCount: 1 }),
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe("error");
    expect(d.findCalled()).toBe(false);
    expect(m.finished.at(-1)?.status).toBe("error");
  });
});

describe("runScan: pipeline + data-minimization (A2.3)", () => {
  const PLAN = {
    "https://a.test/1.jpg": "confirmed",
    "https://b.test/2.jpg": "review",
    "https://c.test/3.jpg": "discard",
    "https://d.test/4.jpg": "noface",
    "https://e.test/5.jpg": "fetchfail",
  } as const;
  const urls = Object.keys(PLAN);

  const fetchImage = async (url: string): Promise<Uint8Array | null> => {
    const outcome = PLAN[url as keyof typeof PLAN];
    if (outcome === "fetchfail") return null;
    const code = { confirmed: 0, review: 1, discard: 2, noface: 3 }[outcome];
    return new Uint8Array([code]);
  };
  const match = async (_refs: number[][], bytes: Uint8Array): Promise<MatchResult> => {
    switch (bytes[0]) {
      case 0: return { score: 95, band: "confirmed", distance: 0.2, faceCount: 1 };
      case 1: return { score: 60, band: "review", distance: 0.55, faceCount: 1 };
      case 2: return { score: 20, band: "discard", distance: 0.8, faceCount: 1 };
      default: return { score: 0, band: "discard", distance: Infinity, faceCount: 0 };
    }
  };

  it("salva solo confirmed/review e cancella OGNI candidato (zero residui)", async () => {
    const m = memRepo([[0, 0]]);
    const d = provider(urls);
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: d.p, fetchImage, match,
      phash: async () => "ph_test", // A2.3: il match conserva URL + phash
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe("done");
    expect(res.candidates).toBe(5);
    expect(res.matches).toBe(2);
    expect(res.discarded).toBe(3);

    expect(m.matches.map((x) => x.band)).toEqual(["confirmed", "review"]);
    expect(m.candidates.size).toBe(0); // nessun candidato residuo (data-minimization)

    const first = m.matches[0];
    expect(first.avatarId).toBe("av1");
    expect(first.scanJobId).toBe("job-1");
    expect(first.sourceUrl).toBe("https://a.test/1.jpg");
    expect(first.host).toBe("a.test");
    expect(first.score).toBe(95);
    expect(first.sensitivity).toBe("standard");
    expect(first.phash).toBe("ph_test");

    expect(m.finished.at(-1)).toMatchObject({ status: "done", stats: { candidates: 5, matches: 2, discarded: 3 } });
  });
});

describe("runScan: immagine-query della discovery", () => {
  function capturingProvider() {
    let lastQuery: unknown;
    const p: DiscoveryProvider = {
      name: "cap",
      enabled: true,
      async find(q) {
        lastQuery = q;
        return [];
      },
    };
    return { p, getQuery: () => lastQuery };
  }

  it("preferisce i BYTE reali (reference) al portrait generato", async () => {
    const m = memRepo([[0, 0]]);
    const cap = capturingProvider();
    const bytes = new Uint8Array([1, 2, 3]);
    await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: cap.p,
      referenceImageBytes: bytes,
      referenceImageUrl: "https://portrait.test/p.png",
    });
    expect(cap.getQuery()).toEqual({ imageBytes: bytes });
  });

  it("usa l'URL (portrait) come fallback se non ci sono byte reali", async () => {
    const m = memRepo([[0, 0]]);
    const cap = capturingProvider();
    await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: cap.p,
      referenceImageUrl: "https://portrait.test/p.png",
    });
    expect(cap.getQuery()).toEqual({ imageUrl: "https://portrait.test/p.png" });
  });
});
