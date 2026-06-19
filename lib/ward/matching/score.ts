import { similarityFromDistance } from "../../face-similarity";

// Scoring/banding del matching Ward. Modulo PURO (niente IO, niente face-api):
// la distanza euclidea tra descrittori 128-d FaceNet diventa una banda d'azione.
// La curva distanza -> percentuale e' UNICA (lib/face-similarity), condivisa col
// face-match KYC: stessa soglia, stesso significato.

export type Band = "confirmed" | "review" | "discard";

export interface Bands {
  confirmedMaxDist: number; // distanza <= => confirmed (alta confidenza)
  reviewMaxDist: number;    // distanza <= => review; oltre => discard. Soglia brief = 0.6.
}

// Default coerenti col brief (soglia 0.6) e con i dati demo della UI (86% =>
// confirmed, 58% => review). Le soglie esatte si tarano a terra (spec 6):
// override via env in bandsFromEnv().
export const DEFAULT_BANDS: Bands = { confirmedMaxDist: 0.5, reviewMaxDist: 0.6 };

export interface Classification {
  band: Band;
  score: number;    // similarita' 0-100 (intero), come la colonna scan_matches.score
  distance: number; // distanza euclidea grezza (mai persistita per i candidati, A2.2)
}

export function euclideanDistance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

// Distanza minima tra il descrittore candidato e i descrittori di riferimento
// (un avatar ha piu' reference). Nessun riferimento => Infinity (=> discard).
export function bestDistance(refs: number[][], d: number[]): number {
  let min = Infinity;
  for (const r of refs) {
    const dist = euclideanDistance(r, d);
    if (dist < min) min = dist;
  }
  return min;
}

export function classify(distance: number, bands: Bands = DEFAULT_BANDS): Classification {
  const score = Number.isFinite(distance) ? similarityFromDistance(distance) : 0;
  let band: Band;
  if (distance <= bands.confirmedMaxDist) band = "confirmed";
  else if (distance <= bands.reviewMaxDist) band = "review";
  else band = "discard";
  return { band, score, distance };
}

// Soglie da env (default coerenti col brief). Impura ma minima: l'unico punto di
// taratura. WARD_MATCH_CONFIRMED_DIST / WARD_MATCH_REVIEW_DIST.
export function bandsFromEnv(): Bands {
  const num = (v: string | undefined, fallback: number) => {
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    confirmedMaxDist: num(process.env.WARD_MATCH_CONFIRMED_DIST, DEFAULT_BANDS.confirmedMaxDist),
    reviewMaxDist: num(process.env.WARD_MATCH_REVIEW_DIST, DEFAULT_BANDS.reviewMaxDist),
  };
}
