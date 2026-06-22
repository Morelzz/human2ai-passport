import { similarityFromDistance } from "./face-similarity";
import type { FaceMatchResult } from "./face-match";

// Modulo PURO (niente "use client", niente face-api, niente IO): trasforma il
// risultato grezzo del face-match (distanze euclidee FaceNet) in un VERDETTO
// leggibile che AIUTA la certificazione manuale. Mai una prova: l'operatore
// decide guardando le immagini. Condiviso tra il flusso di creazione (lettura
// rassicurante sul dispositivo) e la coda operatori (badge dal dato salvato).

export type MatchBand = "strong" | "review" | "weak";
export type IdentityVerdict = MatchBand | "inconclusive";

export interface MatchLeg {
  distance: number;
  similarity: number; // 0-100, dalla curva unica face-similarity
  band: MatchBand;
}

export interface IdentityMatchVerdict {
  verdict: IdentityVerdict;
  // similarita' del legame piu' DEBOLE (l'anello debole comanda); null se
  // inconcludente (un volto non leggibile su un legame).
  score: number | null;
  docSelfie: MatchLeg | null;   // documento (fronte) <-> selfie
  selfiePhoto: MatchLeg | null; // selfie <-> foto dell'avatar
  reasons: string[];            // note leggibili in italiano
}

// Soglie sulla distanza euclidea dei descrittori 128-d FaceNet: identiche al
// matching Ward (lib/ward/matching/score.ts) e alla curva unica face-similarity.
export const STRONG_MAX_DIST = 0.5;
export const REVIEW_MAX_DIST = 0.6;

export function bandFromDistance(distance: number): MatchBand {
  if (distance <= STRONG_MAX_DIST) return "strong";
  if (distance <= REVIEW_MAX_DIST) return "review";
  return "weak";
}

function leg(input: { distance: number } | null | undefined): MatchLeg | null {
  if (!input || !Number.isFinite(input.distance)) return null;
  const distance = input.distance;
  return { distance, similarity: similarityFromDistance(distance), band: bandFromDistance(distance) };
}

const BAND_ORDER: Record<MatchBand, number> = { strong: 0, review: 1, weak: 2 };

export function classifyIdentityMatch(result: FaceMatchResult | null | undefined): IdentityMatchVerdict {
  const docSelfie = leg(result?.doc_selfie);
  const selfiePhoto = leg(result?.selfie_photo);
  const reasons: string[] = [];

  if (!docSelfie) reasons.push("Nessun volto leggibile tra documento e selfie");
  if (!selfiePhoto) reasons.push("Nessun volto leggibile tra selfie e foto dell'avatar");

  // Servono ENTRAMBI i legami: documento->selfie (sei tu sul documento) e
  // selfie->foto (le foto dell'avatar sono tue). Se uno non e' calcolabile,
  // niente verdetto automatico: l'operatore guarda a mano.
  if (!docSelfie || !selfiePhoto) {
    return { verdict: "inconclusive", score: null, docSelfie, selfiePhoto, reasons };
  }

  // L'anello piu' debole comanda il verdetto e lo score.
  const worst = BAND_ORDER[docSelfie.band] >= BAND_ORDER[selfiePhoto.band] ? docSelfie : selfiePhoto;
  const score = Math.min(docSelfie.similarity, selfiePhoto.similarity);
  if (worst.band === "strong") reasons.push("Documento, selfie e foto sembrano la stessa persona");
  else if (worst.band === "review") reasons.push("Somiglianza media: controllare le immagini");
  else reasons.push("Bassa somiglianza: verificare con attenzione");

  return { verdict: worst.band, score, docSelfie, selfiePhoto, reasons };
}
