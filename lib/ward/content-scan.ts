import type { DiscoveryProvider, DiscoveryQuery, Candidate, MatchKind } from "./discovery";
import { domainReputation, type Reputation } from "./reputation";
import { provenanceTag } from "./provenance";
import { isWhitelisted, type AllowEntry } from "./whitelist";

// ORCHESTRATORE Ward v2 (content leak finder). Cerca le COPIE di una NOSTRA
// immagine generata da Semblic: l'asset e' di nostra proprieta', quindi NIENTE
// consenso/KYC da chiedere. Riusa la discovery Google Vision (reverse-image) ma
// interrogata coi BYTE della generazione, non con le foto del volto.
//
// Differenze dal runScan biometrico (lib/ward/scan.ts):
//   - NESSUN gate consenso: si parte diretti al job.
//   - Query discovery = i bytes della GENERAZIONE (una sola immagine).
//   - Verdetto PER IMMAGINE, non biometrico: full-match Vision O phash vicino
//     all'originale = confirmed; partial/similar = review; il resto scartato.
//   - Tag NEUTRI: reputazione del dominio (Task 1) + filigrana presente/assente
//     e certificato (Task 3). Nessuna accusa, nessuna cifra in euro.
//   - La whitelist NASCONDE: i candidati gia' marcati sicuri sono SALTATI.
// DI come scan.ts: in test si iniettano fake (niente DB, rete, sharp); in prod i
// default si caricano LAZY (il modulo resta leggero).

export type { Reputation };

export interface ContentMatchRow {
  generationId: string;
  scanJobId: string;
  sourceUrl: string;
  pageUrl: string | null; // pagina che ospita la copia, se nota
  host: string | null;
  band: "confirmed" | "review";
  reputation: Reputation;     // 'exposed' (giallo) | 'obscure' (rosso)
  watermarkPresent: boolean;  // filigrana invisibile letta sul candidato
  certificate: string | null; // certificato decodificato (se nostra)
  phash: string | null;
}

export interface ContentScanRepository {
  createJob(generationId: string): Promise<string>;
  loadAllowlist(generationId: string): Promise<AllowEntry[]>;
  insertCandidate(jobId: string, sourceUrl: string, phash: string | null): Promise<string>;
  deleteCandidate(candidateId: string): Promise<void>;
  insertMatch(row: ContentMatchRow): Promise<string>;
  finishJob(jobId: string, status: "done" | "error", stats: Record<string, unknown>, error?: string): Promise<void>;
}

export interface AuditFn {
  (entry: { actor: string | null; action: string; target: string | null; meta?: Record<string, unknown> }): Promise<void>;
}

export interface ContentScanDeps {
  repo: ContentScanRepository;
  // I bytes dell'immagine GENERATA: servono sia da query per la discovery sia da
  // ORIGINALE per il confronto phash del verdetto.
  generationBytes: Uint8Array;
  discovery?: DiscoveryProvider;
  fetchImage?: (url: string) => Promise<Uint8Array | null>;
  phash?: (bytes: Uint8Array) => Promise<string | null>;
  decodeWatermark?: (bytes: Uint8Array) => Promise<string | null>;
  audit?: AuditFn;
  limit?: number;
  phashMaxDistance?: number; // soglia phash per "confirmed" (default 8 bit su 64)
}

export interface ContentScanResult {
  ok: boolean;
  jobId?: string;
  status?: string; // "done" | "error"
  candidates: number;  // candidati PROCESSATI (whitelisted esclusi)
  matches: number;
  discarded: number;
  whitelisted: number; // saltati perche' gia' in whitelist (nascosti)
  reason?: string;
}

const DEFAULT_LIMIT = 12;
// Su 64 bit (dhash = 16 hex): entro 8 bit le due immagini sono praticamente
// identiche (ricompressione/resize leggero). Oltre, e' un'altra immagine.
const DEFAULT_PHASH_MAX_DISTANCE = 8;

// Distanza di Hamming tra due phash esadecimali di PARI lunghezza. Lunghezze
// diverse o input vuoti -> Infinity (non confrontabili = mai "confirmed via
// phash"). Pura, esportata per il test.
export function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

// Verdetto PER IMMAGINE (non biometrico): full-match dichiarato da Vision O phash
// quasi identico all'originale = confirmed; partial/similar = review (incerto, lo
// guarda l'utente); tutto il resto scartato. Pura, esportata per il test.
export function contentVerdict(
  matchKind: MatchKind | undefined,
  candPhash: string | null,
  originalPhash: string | null,
  maxDist: number,
): "confirmed" | "review" | "discard" {
  if (matchKind === "full") return "confirmed";
  if (candPhash && originalPhash && hammingHex(candPhash, originalPhash) <= maxDist) return "confirmed";
  // 'partial' = ritaglio/edit della NOSTRA immagine: significativo, va rivisto.
  // 'similar' (visuallySimilar di Vision) col phash lontano = RUMORE: per un
  // ritratto generato sono sosia/scene a caso, NON copie. Non si mostra: se fosse
  // una copia ricompressa, il phash vicino sopra l'avrebbe gia' presa.
  if (matchKind === "partial") return "review";
  return "discard";
}

// Fetch di default di un candidato: solo content-type image/*, null su qualsiasi
// problema (la pipeline tratta null come "scarta").
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

export async function runContentScan(generationId: string, deps: ContentScanDeps): Promise<ContentScanResult> {
  const { repo } = deps;
  const audit: AuditFn = deps.audit ?? (await import("./audit")).appendAudit;
  const fetchImage = deps.fetchImage ?? defaultFetchImage;
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
  let decodeWatermark = deps.decodeWatermark;
  if (!decodeWatermark) {
    const { extractStego } = await import("../stegano");
    decodeWatermark = async (b) => {
      try {
        return await extractStego(Buffer.from(b));
      } catch {
        return null;
      }
    };
  }
  const limit = deps.limit ?? DEFAULT_LIMIT;
  const maxDist = deps.phashMaxDistance ?? DEFAULT_PHASH_MAX_DISTANCE;

  // phash dell'ORIGINALE (la nostra generazione): riferimento del verdetto. Se
  // illeggibile resta null -> il confirmed-via-phash non scatta, ma il full-match
  // di Vision funziona comunque.
  let originalPhash: string | null = null;
  try {
    originalPhash = await phashFn(deps.generationBytes);
  } catch {
    originalPhash = null;
  }

  const provider = deps.discovery ?? (await import("./discovery")).getDiscoveryProvider();
  const jobId = await repo.createJob(generationId);
  await audit({ actor: null, action: "content-scan.started", target: generationId, meta: { jobId, provider: provider.name } });

  // Allowlist dell'utente per questa generazione (la whitelist NASCONDE).
  const allow = await repo.loadAllowlist(generationId);

  // Discovery: UNA query coi BYTE della generazione (reverse-image). A differenza
  // del multi-angolo biometrico qui c'e' una sola immagine: se Vision cade non
  // c'e' fallback -> job in errore.
  const query: DiscoveryQuery = { imageBytes: deps.generationBytes };
  let found: Candidate[];
  try {
    found = await provider.find(query, limit);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await repo.finishJob(jobId, "error", { reason: "discovery_failed" }, msg);
    await audit({ actor: null, action: "content-scan.error", target: generationId, meta: { jobId, reason: "discovery_failed", msg } });
    return { ok: false, status: "error", reason: `Discovery fallita: ${msg}`, jobId, candidates: 0, matches: 0, discarded: 0, whitelisted: 0 };
  }

  // Dedup per url e taglio al budget.
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const c of found) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    candidates.push(c);
    if (candidates.length >= limit) break;
  }

  let matches = 0;
  let discarded = 0;
  let whitelisted = 0;
  for (const cand of candidates) {
    // La whitelist NASCONDE: un candidato gia' marcato sicuro non viene neppure
    // processato (ne' inserito ne' analizzato), conta solo come whitelisted.
    if (isWhitelisted({ sourceUrl: cand.url, pageUrl: cand.pageUrl ?? null, host: cand.host || null }, allow)) {
      whitelisted++;
      continue;
    }
    const candidateId = await repo.insertCandidate(jobId, cand.url, null);
    try {
      const bytes = await fetchImage(cand.url);
      if (!bytes) {
        discarded++;
        continue;
      }
      let candPhash: string | null = null;
      try {
        candPhash = await phashFn(bytes);
      } catch {
        candPhash = null;
      }
      const band = contentVerdict(cand.matchKind, candPhash, originalPhash, maxDist);
      if (band === "confirmed" || band === "review") {
        let cert: string | null = null;
        try {
          cert = await decodeWatermark(bytes);
        } catch {
          cert = null;
        }
        const tag = provenanceTag(cert);
        const reputation = domainReputation(cand.host);
        await repo.insertMatch({
          generationId,
          scanJobId: jobId,
          sourceUrl: cand.url,
          pageUrl: cand.pageUrl ?? null,
          host: cand.host || null,
          band,
          reputation,
          watermarkPresent: tag.ours,
          certificate: tag.certificate,
          phash: candPhash,
        });
        matches++;
        await audit({ actor: null, action: "content-scan.match", target: generationId, meta: { jobId, host: cand.host, band, reputation, watermark: tag.ours } });
      } else {
        discarded++;
      }
    } finally {
      // Transitorieta': il candidato e' cancellato SEMPRE (match o non-match).
      await repo.deleteCandidate(candidateId);
    }
  }

  const processed = candidates.length - whitelisted;
  const stats = { candidates: processed, matches, discarded, whitelisted };
  await repo.finishJob(jobId, "done", stats);
  await audit({ actor: null, action: "content-scan.finished", target: generationId, meta: { jobId, ...stats } });
  return { ok: true, status: "done", jobId, candidates: processed, matches, discarded, whitelisted };
}
