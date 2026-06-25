import { describe, it, expect } from "vitest";
import { runScan, type ScanRepository, type ScanMatchRow } from "./scan";
import type { DiscoveryProvider } from "./discovery";
import type { MatchResult } from "./matching";

// Repo in-memory che traccia il ciclo di vita dei candidati (insert/delete) e i
// match salvati: cosi' verifichiamo la data-minimization senza toccare il DB.
function memRepo(refs: number[][]) {
  const candidates = new Map<string, { jobId: string; url: string }>();
  const insertedUrls: string[] = []; // log append-only nell'ordine di insert (per il round-robin)
  const matches: ScanMatchRow[] = [];
  const finished: { jobId: string; status: string; stats: Record<string, unknown>; error?: string }[] = [];
  let jobs = 0;
  let seq = 0;
  const repo: ScanRepository = {
    async loadReferenceDescriptors() { return refs; },
    async createJob() { jobs++; return "job-1"; },
    async insertCandidate(jobId, url) { const id = "c" + ++seq; candidates.set(id, { jobId, url }); insertedUrls.push(url); return id; },
    async deleteCandidate(id) { candidates.delete(id); },
    async insertMatch(row) { matches.push(row); return "m" + ++seq; },
    async finishJob(jobId, status, stats, error) { finished.push({ jobId, status, stats, error }); },
  };
  return { repo, candidates, insertedUrls, matches, finished, jobs: () => jobs };
}

const audit = async () => {};

// embedRef fake: ogni reference e' frontale (ammessa al match). I test che passano
// referenceImageBytesList lo iniettano per non caricare face-api reale. noDegrade
// silenzia l'allarme di degrado sui test che passano dal fallback indice.
const frontalRef = async () => ({ descriptor: [0, 0] as number[], faceCount: 1, frontality: 1 });
const noDegrade = () => {};

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

// Provider che risponde DIVERSAMENTE per angolo: l'angolo e' il primo byte dei
// bytes della query (cosi' i test simulano le 3 angolazioni reference). Traccia
// gli angoli interrogati nell'ordine.
function anglesProvider(byAngle: Record<number, string[]>) {
  const calls: number[] = [];
  const p: DiscoveryProvider = {
    name: "angles",
    enabled: true,
    async find(q, limit) {
      const angle = (q as { imageBytes?: Uint8Array }).imageBytes?.[0] ?? -1;
      calls.push(angle);
      return (byAngle[angle] ?? []).slice(0, limit).map((url) => ({ url, host: new URL(url).host }));
    },
  };
  return { p, calls };
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
      degrade: noDegrade, // fallback indice (niente immagini reference nel test)
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
    const queries: unknown[] = [];
    const p: DiscoveryProvider = {
      name: "cap",
      enabled: true,
      async find(q) {
        queries.push(q);
        return [];
      },
    };
    return { p, getQuery: () => queries.at(-1), getQueries: () => queries };
  }

  it("preferisce i BYTE reali (reference) al portrait generato", async () => {
    const m = memRepo([[0, 0]]);
    const cap = capturingProvider();
    const bytes = new Uint8Array([1, 2, 3]);
    await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: cap.p,
      referenceImageBytesList: [bytes],
      referenceImageUrl: "https://portrait.test/p.png",
      embedRef: frontalRef,
    });
    expect(cap.getQuery()).toEqual({ imageBytes: bytes });
  });

  it("usa l'URL (portrait) come fallback se non ci sono byte reali", async () => {
    const m = memRepo([[0, 0]]);
    const cap = capturingProvider();
    await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: cap.p,
      referenceImageUrl: "https://portrait.test/p.png",
      degrade: noDegrade, // fallback indice
    });
    expect(cap.getQuery()).toEqual({ imageUrl: "https://portrait.test/p.png" });
  });

  it("interroga la discovery una volta PER OGNI immagine reference (3 angoli)", async () => {
    const m = memRepo([[0, 0]]);
    const cap = capturingProvider();
    const a = new Uint8Array([1]);
    const b = new Uint8Array([2]);
    const c = new Uint8Array([3]);
    await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: cap.p,
      referenceImageBytesList: [a, b, c],
      embedRef: frontalRef,
    });
    expect(cap.getQueries()).toEqual([{ imageBytes: a }, { imageBytes: b }, { imageBytes: c }]);
  });
});

describe("runScan: discovery multi-angolo (union)", () => {
  it("interroga ogni angolo e UNISCE i candidati deduplicando per url", async () => {
    const m = memRepo([[0, 0]]);
    const a = anglesProvider({
      1: ["https://x.test/a.jpg", "https://x.test/shared.jpg"],
      2: ["https://x.test/b.jpg", "https://x.test/shared.jpg"], // shared duplicato tra angoli
      3: ["https://x.test/c.jpg"],
    });
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: a.p,
      referenceImageBytesList: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])],
      embedRef: frontalRef,
      fetchImage: async () => null, // scarta tutti: ci basta contare i candidati dell'unione
    });
    expect(a.calls.sort()).toEqual([1, 2, 3]); // tutti e 3 gli angoli interrogati
    expect(res.candidates).toBe(4); // a, b, c, shared (shared una volta sola)
    expect(new Set(m.insertedUrls)).toEqual(
      new Set(["https://x.test/a.jpg", "https://x.test/b.jpg", "https://x.test/c.jpg", "https://x.test/shared.jpg"]),
    );
  });

  it("round-robin: pesca a turno da ogni angolo e rispetta il cap (limit)", async () => {
    const m = memRepo([[0, 0]]);
    const a = anglesProvider({
      1: ["https://x.test/1a.jpg", "https://x.test/1b.jpg", "https://x.test/1c.jpg"],
      2: ["https://x.test/2a.jpg", "https://x.test/2b.jpg", "https://x.test/2c.jpg"],
      3: ["https://x.test/3a.jpg", "https://x.test/3b.jpg", "https://x.test/3c.jpg"],
    });
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: a.p,
      referenceImageBytesList: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])],
      embedRef: frontalRef,
      fetchImage: async () => null,
      limit: 6,
    });
    expect(res.candidates).toBe(6);
    expect(m.insertedUrls).toEqual([
      "https://x.test/1a.jpg", "https://x.test/2a.jpg", "https://x.test/3a.jpg",
      "https://x.test/1b.jpg", "https://x.test/2b.jpg", "https://x.test/3b.jpg",
    ]);
  });

  it("un angolo che fallisce non interrompe lo scan (degrado, prosegue sugli altri)", async () => {
    const m = memRepo([[0, 0]]);
    const degraded: string[] = [];
    const p: DiscoveryProvider = {
      name: "partial",
      enabled: true,
      async find(q) {
        const angle = (q as { imageBytes?: Uint8Array }).imageBytes?.[0];
        if (angle === 2) throw new Error("angolo 2 down");
        return [{ url: `https://x.test/${angle}.jpg`, host: "x.test" }];
      },
    };
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: p,
      referenceImageBytesList: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])],
      embedRef: frontalRef,
      fetchImage: async () => null,
      degrade: (area) => { degraded.push(area); },
    });
    expect(res.ok).toBe(true);
    expect(res.candidates).toBe(2); // angoli 1 e 3, il 2 e' caduto
    expect(degraded).toContain("ward.discovery_angle_failed");
  });

  it("se TUTTI gli angoli falliscono lo scan e' un errore (discovery_failed)", async () => {
    const m = memRepo([[0, 0]]);
    const p: DiscoveryProvider = {
      name: "alldown",
      enabled: true,
      async find() { throw new Error("vision giu'"); },
    };
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: p,
      referenceImageBytesList: [new Uint8Array([1]), new Uint8Array([2])],
      embedRef: frontalRef,
      degrade: () => {},
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe("error");
    expect(res.reason).toMatch(/Discovery fallita/);
    expect(m.finished.at(-1)?.status).toBe("error");
    expect(m.candidates.size).toBe(0); // nessun candidato (data-minimization)
  });
});

describe("runScan: match solo sui FRONTALI (B)", () => {
  it("il match riceve SOLO i descrittori frontali (i profili non votano)", async () => {
    const m = memRepo([]); // i refs vengono dalle IMMAGINI, non dall'indice
    const byByte: Record<number, { descriptor: number[]; frontality: number }> = {
      1: { descriptor: [1, 1], frontality: 0.9 }, // frontale
      2: { descriptor: [2, 2], frontality: 0.3 }, // profilo
      3: { descriptor: [3, 3], frontality: 0.2 }, // profilo
    };
    const embedRef = async (b: Uint8Array) => ({ ...byByte[b[0]], faceCount: 1 });
    let seenRefs: number[][] | null = null;
    const match = async (refs: number[][]): Promise<MatchResult> => {
      seenRefs = refs;
      return { score: 10, band: "discard", distance: 0.9, faceCount: 1 };
    };
    const d = provider(["https://a.test/1.jpg"]);
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: d.p,
      referenceImageBytesList: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])],
      embedRef, match,
      fetchImage: async () => new Uint8Array([9]),
    });
    expect(res.ok).toBe(true);
    expect(seenRefs).toEqual([[1, 1]]); // solo il frontale (0.9 >= 0.75)
  });

  it("nessuna reference frontale: done a 0, degrado, discovery NON chiamata", async () => {
    const m = memRepo([]);
    const embedRef = async () => ({ descriptor: [0, 0], faceCount: 1, frontality: 0.3 }); // tutti profili
    const degraded: string[] = [];
    const d = provider(["https://a.test/1.jpg"]);
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: d.p,
      referenceImageBytesList: [new Uint8Array([1]), new Uint8Array([2])],
      embedRef, degrade: (a) => degraded.push(a),
    });
    expect(res.ok).toBe(true);
    expect(res.status).toBe("done");
    expect(res.matches).toBe(0);
    expect(res.candidates).toBe(0);
    expect(d.findCalled()).toBe(false); // niente match possibile -> discovery saltata
    expect(degraded).toContain("ward.no_frontal_reference");
  });

  it("nessuna immagine reference: fallback ai descrittori dell'indice (con degrado)", async () => {
    const m = memRepo([[0, 0]]); // l'indice ha un descrittore
    const degraded: string[] = [];
    const d = provider(["https://a.test/1.jpg"]);
    const res = await runScan("av1", {
      repo: m.repo, audit, gate: okGate, discovery: d.p,
      // niente referenceImageBytesList -> fallback indice
      fetchImage: async () => null,
      match: async () => ({ score: 0, band: "discard", distance: 1, faceCount: 0 }),
      degrade: (a) => degraded.push(a),
    });
    expect(res.ok).toBe(true);
    expect(d.findCalled()).toBe(true); // ha proceduto con l'indice
    expect(degraded).toContain("ward.frontal_from_index_unfiltered");
  });
});
