// ──────────────────────────────────────────────────────────────────────────
// Curve tonali e RGB: valutazione multi-punto. Usata da lib/editor/pipeline per
// costruire le LUT applicate ai pixel reali. Porta di evalC del prototipo
// design/anteprima_editor_mobile.html. I punti sono in 0..100 (x input, y output).
// ──────────────────────────────────────────────────────────────────────────

import type { CurvePoint } from "@/lib/editor/types";

// Valuta una curva (lista di punti ordinati per x) in t (0..1) -> 0..1.
export function evalCurve(points: CurvePoint[], t: number): number {
  const x = t * 100;
  if (x <= points[0][0]) return points[0][1] / 100;
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1] / 100;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const a = points[i - 1];
      const b = points[i];
      const f = (x - a[0]) / ((b[0] - a[0]) || 1);
      return (a[1] + (b[1] - a[1]) * f) / 100;
    }
  }
  return 1;
}
