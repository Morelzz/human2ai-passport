// Frontalita' di un volto dai landmark face-api (68 punti). PURA, niente IO.
// Proxy di YAW: in un volto frontale il naso (punto 30) e' orizzontalmente al
// centro tra gli estremi della mascella (punti 0 e 16); di profilo si sposta su
// un estremo. Indipendente da scala/traslazione (rapporto), robusto quel tanto
// che basta per separare "frontale" da "profilo" (la cura vera dei profili e' un
// modello pose-robust, opzione C). Nel dubbio (landmark incompleti o degeneri)
// ritorna 0 = NON frontale: il gate Ward e' fail-safe.

export interface Point {
  x: number;
  y: number;
}

const JAW_LEFT = 0;
const JAW_RIGHT = 16;
const NOSE_TIP = 30;

// Ritorna [0,1]: 1 = naso perfettamente centrato (frontale), 0 = naso su un
// estremo mascella (profilo pieno) o landmark non validi.
export function frontalityFromLandmarks(points: Point[]): number {
  if (!Array.isArray(points) || points.length < 68) return 0;
  const left = points[JAW_LEFT];
  const right = points[JAW_RIGHT];
  const nose = points[NOSE_TIP];
  if (!left || !right || !nose) return 0;

  const lo = Math.min(left.x, right.x);
  const hi = Math.max(left.x, right.x);
  const span = hi - lo;
  if (span < 1e-6) return 0; // mascella degenere: non misurabile

  const t = (nose.x - lo) / span; // 0.5 = centrato
  const frontality = 1 - 2 * Math.abs(t - 0.5);
  return Math.max(0, Math.min(1, frontality));
}
