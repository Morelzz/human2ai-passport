import { describe, it, expect } from "vitest";
import {
  runContentScan,
  hammingHex,
  contentVerdict,
  type ContentScanRepository,
  type ContentMatchRow,
} from "./content-scan";
import type { DiscoveryProvider, Candidate } from "./discovery";
import type { AllowEntry } from "./whitelist";

// Repo in-memory: traccia il ciclo di vita dei candidati (insert/delete) e i match
// salvati, cosi' verifichiamo la pipeline e la transitorieta' senza toccare il DB.
function memRepo(allow: AllowEntry[]) {
  const candidates = new Map<string, { jobId: string; url: string }>();
  const insertedUrls: string[] = [];
  const matches: ContentMatchRow[] = [];
  const finished: { jobId: string; status: string; stats: Record<string, unknown>; error?: string }[] = [];
  let jobs = 0;
  let seq = 0;
  const repo: ContentScanRepository = {
    async createJob() { jobs++; return "job-1"; },
    async loadAllowlist() { return allow; },
    async insertCandidate(jobId, url) { const id = "c" + ++seq; candidates.set(id, { jobId, url }); insertedUrls.push(url); return id; },
    async deleteCandidate(id) { candidates.delete(id); },
    async insertMatch(row) { matches.push(row); return "m" + ++seq; },
    async finishJob(jobId, status, stats, error) { finished.push({ jobId, status, stats, error }); },
  };
  return { repo, candidates, insertedUrls, matches, finished, jobs: () => jobs };
}

const audit = async () => {};

// Provider che cattura la query e ritorna i candidati passati (rispettando limit).
function capturingProvider(cands: Candidate[]) {
  const queries: unknown[] = [];
  const p: DiscoveryProvider = {
    name: "cap",
    enabled: true,
    async find(q, limit) {
      queries.push(q);
      return cands.slice(0, limit);
    },
  };
  return { p, getQuery: () => queries.at(-1) };
}

describe("hammingHex (distanza tra due phash esadecimali)", () => {
  it("hash uguali = 0", () => {
    expect(hammingHex("00", "00")).toBe(0);
    expect(hammingHex("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });
  it("conta i bit diversi nibble per nibble", () => {
    expect(hammingHex("0f", "00")).toBe(4);
    expect(hammingHex("ff", "00")).toBe(8);
    expect(hammingHex("0000000000000000", "0000000000000001")).toBe(1);
  });
  it("lunghezze diverse o input vuoti = Infinity (non confrontabili)", () => {
    expect(hammingHex("abc", "ab")).toBe(Infinity);
    expect(hammingHex("", "")).toBe(Infinity);
    expect(hammingHex("00", "")).toBe(Infinity);
  });
});

describe("contentVerdict (verdetto per immagine, non biometrico)", () => {
  const ORIG = "0000000000000000";
  it("Vision full match = confirmed, a prescindere dal phash", () => {
    expect(contentVerdict("full", "ffffffffffffffff", ORIG, 8)).toBe("confirmed");
  });
  it("phash vicino all'originale = confirmed anche se solo 'similar'", () => {
    expect(contentVerdict("similar", "0000000000000001", ORIG, 8)).toBe("confirmed");
  });
  it("partial lontano = review (un ritaglio o edit resta significativo)", () => {
    expect(contentVerdict("partial", "ffffffffffffffff", ORIG, 8)).toBe("review");
  });
  it("solo-simile (visuallySimilar) col phash lontano = discard: e' rumore, sosia a caso", () => {
    expect(contentVerdict("similar", "ffffffffffffffff", ORIG, 8)).toBe("discard");
  });
  it("nessun match-kind e phash lontano = discard", () => {
    expect(contentVerdict(undefined, "ffffffffffffffff", ORIG, 8)).toBe("discard");
    expect(contentVerdict(undefined, null, null, 8)).toBe("discard");
  });
});

describe("runContentScan: query della discovery", () => {
  it("interroga la discovery coi BYTE dell'immagine generata (una sola immagine)", async () => {
    const m = memRepo([]);
    const cap = capturingProvider([]);
    const original = new Uint8Array([0]);
    await runContentScan("gen-1", {
      repo: m.repo, audit, discovery: cap.p,
      generationBytes: original,
      phash: async () => "0000000000000000",
    });
    expect(cap.getQuery()).toEqual({ imageBytes: original });
  });
});

describe("runContentScan: pipeline + tag + whitelist", () => {
  // Ogni candidato porta: matchKind (dalla discovery), un codice nei bytes (per il
  // phash finto e il watermark finto). 'full' confermato via full-match, 'close'
  // confermato via phash vicino, partial/similar = review, far = discard, wl =
  // whitelisted (saltato), fail = fetch nullo (scartato).
  const C = {
    full:    { url: "https://instagram.com/full.jpg", host: "instagram.com", matchKind: "full" as const,    code: 9 },
    close:   { url: "https://dark.ru/close.jpg",       host: "dark.ru",       matchKind: "similar" as const, code: 1 },
    partial: { url: "https://blog.io/partial.jpg",     host: "blog.io",       matchKind: "partial" as const, code: 2 },
    similar: { url: "https://other.io/similar.jpg",    host: "other.io",      matchKind: "similar" as const, code: 3 },
    far:     { url: "https://nope.io/far.jpg",         host: "nope.io",       matchKind: undefined,           code: 4 },
    wl:      { url: "https://safe.com/wl.jpg",          host: "safe.com",      matchKind: "full" as const,    code: 5 },
    fail:    { url: "https://fetchfail.io/x.jpg",       host: "fetchfail.io",  matchKind: "partial" as const, code: 0 },
  };
  const order = [C.full, C.close, C.partial, C.similar, C.far, C.wl, C.fail];
  const cands: Candidate[] = order.map((c) => ({ url: c.url, host: c.host, matchKind: c.matchKind }));

  const phashByCode: Record<number, string> = {
    7: "0000000000000000", // originale
    9: "ffffffffffffffff", // full ma phash lontano (confermato dal full-match)
    1: "0000000000000001", // close: phash a distanza 1 dall'originale
    2: "ffffffffffffffff",
    3: "ffffffffffffffff",
    4: "ffffffffffffffff",
  };
  const certByCode: Record<number, string> = { 9: "cert-abc" }; // solo 'full' ha la filigrana

  const fetchImage = async (url: string): Promise<Uint8Array | null> => {
    const e = order.find((c) => c.url === url);
    if (!e || e.code === 0) return null; // fail = fetch nullo
    return new Uint8Array([e.code]);
  };
  const phash = async (bytes: Uint8Array): Promise<string | null> => phashByCode[bytes[0]] ?? null;
  const decodeWatermark = async (bytes: Uint8Array): Promise<string | null> => certByCode[bytes[0]] ?? null;

  it("salva confirmed/review coi tag giusti, salta i whitelisted, cancella ogni candidato", async () => {
    const m = memRepo([{ type: "host", value: "safe.com" }]);
    const cap = capturingProvider(cands);
    const res = await runContentScan("gen-1", {
      repo: m.repo, audit, discovery: cap.p,
      generationBytes: new Uint8Array([7]),
      fetchImage, phash, decodeWatermark,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe("done");
    expect(res.candidates).toBe(6);    // i 7 meno il whitelisted (mai processato)
    expect(res.whitelisted).toBe(1);
    expect(res.matches).toBe(3);       // full + close (confirmed), partial (review). il solo-simile ora e' scartato.
    expect(res.discarded).toBe(3);     // far + fail + similar (rumore)

    expect(m.matches.map((x) => x.band)).toEqual(["confirmed", "confirmed", "review"]);

    const full = m.matches[0];
    expect(full.generationId).toBe("gen-1");
    expect(full.scanJobId).toBe("job-1");
    expect(full.sourceUrl).toBe("https://instagram.com/full.jpg");
    expect(full.host).toBe("instagram.com");
    expect(full.reputation).toBe("exposed");
    expect(full.watermarkPresent).toBe(true);
    expect(full.certificate).toBe("cert-abc");
    expect(full.phash).toBe("ffffffffffffffff");

    const close = m.matches[1];
    expect(close.host).toBe("dark.ru");
    expect(close.reputation).toBe("obscure");
    expect(close.watermarkPresent).toBe(false);
    expect(close.certificate).toBe(null);
    expect(close.phash).toBe("0000000000000001");

    // transitorieta': nessun candidato residuo e il whitelisted NON e' mai stato inserito
    expect(m.candidates.size).toBe(0);
    expect(m.insertedUrls).not.toContain("https://safe.com/wl.jpg");
    expect(m.insertedUrls.length).toBe(6);

    expect(m.finished.at(-1)).toMatchObject({ status: "done", stats: { candidates: 6, matches: 3, discarded: 3, whitelisted: 1 } });
  });
});

describe("runContentScan: niente gate consenso", () => {
  it("procede diretta al job (l'asset e' nostro, nessun consenso da chiedere)", async () => {
    const m = memRepo([]);
    const cap = capturingProvider([{ url: "https://x.io/a.jpg", host: "x.io", matchKind: "full" }]);
    const res = await runContentScan("gen-1", {
      repo: m.repo, audit, discovery: cap.p,
      generationBytes: new Uint8Array([7]),
      fetchImage: async () => new Uint8Array([9]),
      phash: async (b) => (b[0] === 9 ? "abc" : "abc"),
      decodeWatermark: async () => null,
    });
    expect(res.ok).toBe(true);
    expect(m.jobs()).toBe(1);
    expect(res.matches).toBe(1); // full-match confermato senza alcun gate
  });
});

describe("runContentScan: discovery fallita", () => {
  it("chiude il job in errore e non lascia candidati", async () => {
    const m = memRepo([]);
    const p: DiscoveryProvider = {
      name: "down", enabled: true,
      async find() { throw new Error("vision giu'"); },
    };
    const res = await runContentScan("gen-1", {
      repo: m.repo, audit, discovery: p,
      generationBytes: new Uint8Array([7]),
      phash: async () => "0000000000000000",
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe("error");
    expect(res.reason).toMatch(/Discovery fallita/);
    expect(m.finished.at(-1)?.status).toBe("error");
    expect(m.candidates.size).toBe(0);
  });
});
