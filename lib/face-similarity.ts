// Distanza FaceNet -> percentuale leggibile. Modulo PURO (niente "use client",
// niente server-only): è la FONTE UNICA della curva, usata sia dal face-match
// KYC nel browser sia dal fallback /api/verify-face lato server.
// Curva logistica centrata sulla soglia "stessa persona" (~0.6):
// 0.4 -> ~88%, 0.55 -> ~62%, 0.6 -> 50%, 0.7 -> ~27%.
export function similarityFromDistance(distance: number): number {
  return Math.round(100 / (1 + Math.exp((distance - 0.6) / 0.1)));
}
