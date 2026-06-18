// ──────────────────────────────────────────────────────────────────────────
// Curve tonali e RGB: valutazione multi-punto + tabelle per il
// feComponentTransfer SVG dell'anteprima. Porta di evalC/applyCurves del
// prototipo design/anteprima_editor_mobile.html (righe 287-290).
// I punti sono in coordinate 0..100 (x = input, y = output). La master RGB si
// compone SOPRA i canali R/G/B. In produzione la stessa logica diventa una LUT
// per canale nella resa server (fase successiva).
// ──────────────────────────────────────────────────────────────────────────

import type { Curves, CurvePoint } from "@/lib/editor/types";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

const NC = 18; // campioni per la tabella (come il prototipo)

// tableValues (stringhe) per i 3 feFunc, con la master RGB applicata sopra ogni
// canale. All'identita producono una rampa lineare "0 ... 1" (no-op).
export function curveTables(curves: Curves): { r: string; g: string; b: string } {
  const r: string[] = [];
  const g: string[] = [];
  const b: string[] = [];
  for (let i = 0; i <= NC; i++) {
    const t = i / NC;
    r.push(clamp01(evalCurve(curves.rgb, evalCurve(curves.r, t))).toFixed(3));
    g.push(clamp01(evalCurve(curves.rgb, evalCurve(curves.g, t))).toFixed(3));
    b.push(clamp01(evalCurve(curves.rgb, evalCurve(curves.b, t))).toFixed(3));
  }
  return { r: r.join(" "), g: g.join(" "), b: b.join(" ") };
}

// La curva di un canale e all'identita?
export function curveIsIdentity(p: CurvePoint[]): boolean {
  return p.length === 2 && p[0][0] === 0 && p[0][1] === 0 && p[1][0] === 100 && p[1][1] === 100;
}
