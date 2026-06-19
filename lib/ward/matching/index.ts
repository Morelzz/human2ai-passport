import { embed } from "./embed";
import { bestDistance, classify, bandsFromEnv, type Band, type Bands } from "./score";

export * from "./score";
export { embed };
export type { EmbedResult } from "./embed";

export interface MatchResult {
  score: number;
  band: Band;
  distance: number;
  faceCount: number;
}

// match(referenceDescriptors[], candidateImage): embedda il candidato e lo
// classifica contro i riferimenti dell'avatar. E' 1:1 con la persona monitorata
// (A2: niente "chi e' questo sconosciuto"). NON ritorna MAI il descrittore del
// candidato: solo banda/score/distanza. Stessa firma che domani implementera'
// ArcFace 512-d senza toccare i chiamanti (spec D1).
export async function match(
  referenceDescriptors: number[][],
  candidateImage: Uint8Array,
  bands: Bands = bandsFromEnv(),
): Promise<MatchResult> {
  const { descriptor, faceCount } = await embed(candidateImage);
  if (!descriptor) return { score: 0, band: "discard", distance: Infinity, faceCount };
  const distance = bestDistance(referenceDescriptors, descriptor);
  const c = classify(distance, bands);
  return { score: c.score, band: c.band, distance: c.distance, faceCount };
}
