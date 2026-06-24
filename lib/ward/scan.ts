import type { GateResult } from "./gate";
import type { DiscoveryProvider, DiscoveryQuery, Candidate } from "./discovery";
import type { MatchResult } from "./matching";
import { classifySensitivity, type Sensitivity } from "./sensitivity";

// ORCHESTRATORE di scan (Job B), Module 1. Cablaggio esplicito con dependency
// injection: in test si iniettano fake (niente DB, niente rete, niente face-api),
// in prod i default si caricano LAZY (cosi' questo modulo resta leggero e i suoi
// import non trascinano @/lib/supabase ne' face-api).
//
// Flusso (spec 3.3): gate -> job -> reference -> discovery -> per ogni candidato:
//   insert candidate -> fetch -> embed+match -> (confirmed|review) salva match,
//   altrimenti niente -> SEMPRE cancella il candidato.
// Regole non negoziabili applicate in codice:
//   A2.1 consent gate prima di tutto; A2.2/A2.3 mai persistere descrittori/bytes
//   dei terzi, candidato transitorio cancellato sempre, sui non-match zero
//   ritenzione, sui match solo URL + (in futuro) phash.

export type { Sensitivity }; // fonte unica: ./sensitivity

export interface ScanMatchRow {
  avatarId: string;
  scanJobId: string;
  sourceUrl: string;
  host: string | null;
  score: number;
  band: "confirmed" | "review";
  sensitivity: Sensitivity;
  phash: string | null;
}

export interface ScanRepository {
  loadReferenceDescriptors(avatarId: string): Promise<number[][]>;
  createJob(avatarId: string, provider: string): Promise<string>;
  insertCandidate(jobId: string, sourceUrl: string, phash: string | null): Promise<string>;
  deleteCandidate(candidateId: string): Promise<void>;
  insertMatch(row: ScanMatchRow): Promise<string>;
  finishJob(jobId: string, status: "done" | "error", stats: Record<string, unknown>, error?: string): Promise<void>;
}

export interface AuditFn {
  (entry: { actor: string | null; action: string; target: string | null; meta?: Record<string, unknown> }): Promise<void>;
}

export interface ScanDeps {
  repo: ScanRepository;
  gate?: (avatarId: string) => Promise<GateResult>;
  discovery?: DiscoveryProvider;
  fetchImage?: (url: string) => Promise<Uint8Array | null>;
  match?: (refs: number[][], bytes: Uint8Array) => Promise<MatchResult>;
  phash?: (bytes: Uint8Array) => Promise<string | null>;
  audit?: AuditFn;
  referenceImageBytes?: Uint8Array; // FOTO REALE della persona (reference) per la discovery: query migliore del portrait generato
  referenceImageUrl?: string; // fallback: per i provider reali (Google Vision); lo stub lo ignora
  limit?: number;
}

export interface ScanResult {
  ok: boolean;
  jobId?: string;
  status?: string; // "done" | "error" | stato consenso ("revoked"|"expired"|"none")
  candidates: number;
  matches: number;
  discarded: number;
  reason?: string;
}

const DEFAULT_LIMIT = 12;

// Fetch di default di un'immagine candidata: accetta solo content-type image/*,
// ritorna null su qualsiasi problema (la pipeline tratta null come "scarta").
async function defaultFetchImage(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function runScan(avatarId: string, deps: ScanDeps): Promise<ScanResult> {
  const { repo } = deps;
  const gate = deps.gate ?? (await import("./gate")).assertMonitoringConsent;
  const audit: AuditFn = deps.audit ?? (await import("./audit")).appendAudit;
  const fetchImage = deps.fetchImage ?? defaultFetchImage;
  const matchFn = deps.match ?? (await import("./matching")).match;
  let phashFn = deps.phash;
  if (!phashFn) {
    const { phashOf } = await import("./evidence/phash");
    phashFn = async (b) => {
      try {
        return await phashOf(b);
      } catch {
        return null;
      }
    };
  }
  const limit = deps.limit ?? DEFAULT_LIMIT;

  // 1. GATE (A2.1): nessuno scan senza consenso attivo. Il gate logga gia' l'esito.
  const g = await gate(avatarId);
  if (!g.ok) {
    return { ok: false, status: g.status, reason: g.reason, candidates: 0, matches: 0, discarded: 0 };
  }

  const provider = deps.discovery ?? (await import("./discovery")).getDiscoveryProvider();
  const jobId = await repo.createJob(avatarId, provider.name);
  await audit({ actor: null, action: "scan.started", target: avatarId, meta: { jobId, provider: provider.name } });

  // 2. Riferimenti dell'avatar: descrittori GIA' registrati (nessun re-embedding).
  const refs = await repo.loadReferenceDescriptors(avatarId);
  if (!refs.length) {
    await repo.finishJob(jobId, "error", { reason: "no_reference_descriptors" }, "no_reference_descriptors");
    await audit({ actor: null, action: "scan.error", target: avatarId, meta: { jobId, reason: "no_reference_descriptors" } });
    return { ok: false, status: "error", reason: "Nessun descrittore di riferimento per l'avatar", jobId, candidates: 0, matches: 0, discarded: 0 };
  }

  // 3. Discovery (similarita' di CONTENUTO, non biometria). Si interroga con la
  //    FOTO REALE della persona (reference) se disponibile: il portrait generato
  //    depista la ricerca (Vision non trova la persona reale). Fallback al portrait.
  const query: DiscoveryQuery = deps.referenceImageBytes
    ? { imageBytes: deps.referenceImageBytes }
    : deps.referenceImageUrl
    ? { imageUrl: deps.referenceImageUrl }
    : {};
  let candidates: Candidate[];
  try {
    candidates = await provider.find(query, limit);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await repo.finishJob(jobId, "error", { reason: "discovery_failed" }, msg);
    await audit({ actor: null, action: "scan.error", target: avatarId, meta: { jobId, reason: "discovery_failed", msg } });
    return { ok: false, status: "error", reason: `Discovery fallita: ${msg}`, jobId, candidates: 0, matches: 0, discarded: 0 };
  }

  // 4. Per candidato: embed + match. Confirmed/review -> scan_matches. Sempre
  //    cancella il candidato (transitorio, A2.3).
  let matches = 0;
  let discarded = 0;
  for (const cand of candidates) {
    const candidateId = await repo.insertCandidate(jobId, cand.url, null);
    try {
      const bytes = await fetchImage(cand.url);
      if (!bytes) {
        discarded++;
        continue;
      }
      const m = await matchFn(refs, bytes);
      if (m.band === "confirmed" || m.band === "review") {
        // A2.3: sul match si tiene solo URL + phash (mai il descrittore/bytes).
        let phash: string | null = null;
        try {
          phash = await phashFn(bytes);
        } catch {
          phash = null;
        }
        await repo.insertMatch({
          avatarId,
          scanJobId: jobId,
          sourceUrl: cand.url,
          host: cand.host || null,
          score: m.score,
          band: m.band,
          // Sensibilita' classificata sull'host (slice host-based, lib/ward/sensitivity):
          // un volto su un sito adult -> 'sensitive'. 'minor' resta a valle (contenuto/eta').
          sensitivity: classifySensitivity(cand.host),
          phash,
        });
        matches++;
        await audit({ actor: null, action: "scan.match", target: avatarId, meta: { jobId, host: cand.host, band: m.band, score: m.score } });
      } else {
        discarded++;
      }
    } finally {
      // A2.3: il candidato e' transitorio, cancellato SEMPRE (match o non-match).
      await repo.deleteCandidate(candidateId);
    }
  }

  await repo.finishJob(jobId, "done", { candidates: candidates.length, matches, discarded });
  await audit({ actor: null, action: "scan.finished", target: avatarId, meta: { jobId, candidates: candidates.length, matches, discarded } });
  return { ok: true, status: "done", jobId, candidates: candidates.length, matches, discarded };
}
