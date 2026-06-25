import type { GateResult } from "./gate";
import type { DiscoveryProvider, DiscoveryQuery, Candidate } from "./discovery";
import type { MatchResult } from "./matching";
import { classifySensitivity, type Sensitivity } from "./sensitivity";
import type { DegradationArea } from "../observability";

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
  pageUrl: string | null; // pagina che ospita l'immagine (per il link), se nota
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
  // FOTO REALI della persona (reference, le 3 angolazioni) per la discovery: si
  // interroga il provider con OGNI angolo e si UNISCONO i candidati (un profilo
  // trova foto che il frontale manca). Query migliore del portrait generato.
  referenceImageBytesList?: Uint8Array[];
  referenceImageUrl?: string; // fallback: per i provider reali (Google Vision); lo stub lo ignora
  // Embedder iniettabile (default: embed reale face-api). Ricava dai bytes
  // reference il descrittore e la FRONTALITA': il match biometrico gira SOLO sui
  // frontali (i profili non sono discriminanti -> falsi positivi via bestDistance).
  embedRef?: (bytes: Uint8Array) => Promise<{ descriptor: number[] | null; frontality: number | null; faceCount: number }>;
  // Allarme su degrado, iniettabile (default: reportDegradation). Usato quando un
  // singolo angolo della discovery fallisce: si degrada e si prosegue sugli altri.
  degrade?: (area: DegradationArea, detail?: Record<string, unknown>) => void;
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

// Soglia di frontalita' (tarata a terra: frontale ~0.97, profilo/tre-quarti <=0.65).
// Accetta SOLO (0,1]: un valore fuori range (typo tipo "2" o "7.5") escluderebbe
// ogni reference -> ogni scan tornerebbe done/0 in silenzio ("protegge nulla").
// Fuori range o non numerico -> default 0.75. Pura, esportata per il test.
export function resolveFrontalMin(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.75;
}

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
  const degrade = deps.degrade ?? (await import("../observability")).reportDegradation;
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

  // 2. Riferimenti per il MATCH biometrico: SOLO volti FRONTALI. I descrittori di
  //    profilo non sono discriminanti (verificato a terra: lo stesso volto frontale
  //    vs profilo gia' a 0.62-0.71) e via bestDistance (minima) fabbricherebbero
  //    falsi positivi. Si embeddano le immagini reference (gia' scaricate per la
  //    discovery) e si tengono solo le frontali (frontality >= soglia). Senza
  //    immagini (es. seed col solo portrait): fallback ai descrittori dell'indice.
  const frontalMin = resolveFrontalMin(process.env.WARD_FRONTAL_MIN);
  const refImages = deps.referenceImageBytesList ?? [];
  let refs: number[][];
  if (refImages.length > 0) {
    const embedRef = deps.embedRef ?? (await import("./matching/embed")).embed;
    const embedded = await Promise.all(
      refImages.map((b) => embedRef(b).catch(() => ({ descriptor: null, frontality: null, faceCount: 0 }))),
    );
    refs = embedded
      .filter((e) => e.descriptor && (e.frontality ?? 0) >= frontalMin)
      .map((e) => e.descriptor as number[]);
    if (refs.length === 0) {
      // Fail-safe: nessuna reference frontale leggibile. Niente match (meglio
      // niente che falsi positivi dai profili). Job chiuso done a 0, degrado
      // segnalato cosi' l'operatore aggiunge una frontale.
      degrade("ward.no_frontal_reference", { jobId, references: refImages.length });
      await repo.finishJob(jobId, "done", { candidates: 0, matches: 0, discarded: 0, reason: "no_frontal_reference" });
      await audit({ actor: null, action: "scan.finished", target: avatarId, meta: { jobId, candidates: 0, matches: 0, discarded: 0, reason: "no_frontal_reference" } });
      return { ok: true, status: "done", jobId, candidates: 0, matches: 0, discarded: 0, reason: "no_frontal_reference" };
    }
  } else {
    // Nessuna immagine reference: non posso calcolare la frontalita', fallback ai
    // descrittori dell'indice (non filtrati per posa).
    refs = await repo.loadReferenceDescriptors(avatarId);
    if (refs.length > 0) degrade("ward.frontal_from_index_unfiltered", { jobId });
  }
  if (!refs.length) {
    await repo.finishJob(jobId, "error", { reason: "no_reference_descriptors" }, "no_reference_descriptors");
    await audit({ actor: null, action: "scan.error", target: avatarId, meta: { jobId, reason: "no_reference_descriptors" } });
    return { ok: false, status: "error", reason: "Nessun descrittore di riferimento per l'avatar", jobId, candidates: 0, matches: 0, discarded: 0 };
  }

  // 3. Discovery (similarita' di CONTENUTO, non biometria). Si interroga con le
  //    FOTO REALI della persona (reference, le 3 angolazioni): il portrait generato
  //    depista la ricerca. Una query PER ANGOLO, poi si uniscono i candidati: un
  //    profilo trova foto che il frontale manca. Fallback al portrait se non ci
  //    sono reference (es. seed).
  const queries: DiscoveryQuery[] =
    deps.referenceImageBytesList && deps.referenceImageBytesList.length > 0
      ? deps.referenceImageBytesList.map((bytes) => ({ imageBytes: bytes }))
      : deps.referenceImageUrl
      ? [{ imageUrl: deps.referenceImageUrl }]
      : [{}];

  // Fan-out PARALLELO e tollerante: gli angoli (anche 6-8 sui founder) si
  // interrogano in concorrenza (allSettled preserva l'ordine -> il round-robin
  // resta deterministico). Un angolo che fallisce NON interrompe lo scan (degrado,
  // non abort: la completezza non e' un gate di sicurezza). Si fallisce solo se
  // OGNI angolo fallisce, col comportamento di prima (status error/discovery_failed).
  // Il costo pesante (embed+match) resta fisso al cap dell'unione: scala solo Vision.
  const settled = await Promise.allSettled(queries.map((q) => provider.find(q, limit)));
  const perAngle: Candidate[][] = [];
  let anyOk = false;
  let lastErr = "";
  for (const r of settled) {
    if (r.status === "fulfilled") {
      perAngle.push(r.value);
      anyOk = true;
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      lastErr = msg;
      perAngle.push([]);
      degrade("ward.discovery_angle_failed", { jobId, msg });
    }
  }
  if (!anyOk) {
    await repo.finishJob(jobId, "error", { reason: "discovery_failed" }, lastErr);
    await audit({ actor: null, action: "scan.error", target: avatarId, meta: { jobId, reason: "discovery_failed", msg: lastErr } });
    return { ok: false, status: "error", reason: `Discovery fallita: ${lastErr}`, jobId, candidates: 0, matches: 0, discarded: 0 };
  }

  // Union ROUND-ROBIN: pesco a turno il candidato i-esimo di ogni angolo, dedup
  // per url, mi fermo al budget `limit`. Cosi' ogni angolo contribuisce equamente
  // e il costo (embed+match per candidato) resta quello di prima.
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(0, ...perAngle.map((a) => a.length));
  outer: for (let i = 0; i < maxLen; i++) {
    for (const angle of perAngle) {
      const cand = angle[i];
      if (!cand || seen.has(cand.url)) continue;
      seen.add(cand.url);
      candidates.push(cand);
      if (candidates.length >= limit) break outer;
    }
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
          pageUrl: cand.pageUrl ?? null,
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
