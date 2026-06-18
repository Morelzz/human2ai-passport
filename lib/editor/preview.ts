// ──────────────────────────────────────────────────────────────────────────
// Semblic Editor: composizione dell'ANTEPRIMA live (client).
// Porta FEDELE della funzione apply() del prototipo
// design/anteprima_editor_mobile.html (righe 302-314): da EditState a una
// stringa CSS `filter` per l'immagine + le opacita dei layer vignetta/grana.
//
// In Fase 1 sono esposti solo Preset/intensita, Luce, Colore: i contributi di
// Dettaglio e Mixer HSL sono gia qui ma NEUTRI a valori 0 (la UI li attiva in
// Fase 2). Le CURVE (url(#curveFilter)) si agganciano in Fase 2, quando lo
// stage monta il filtro SVG feComponentTransfer.
//
// La resa FINALE (download/upscale) sara server-side con sharp (fase
// successiva), con logica equivalente sui pixel reali.
// ──────────────────────────────────────────────────────────────────────────

import type { EditState, HslMap } from "@/lib/editor/types";
import { presetByKey } from "@/lib/editor/types";

export interface ComposedPreview {
  filter: string; // valore di CSS `filter` per l'immagine
  vig: number; // opacita del layer vignettatura, 0..1
  grain: number; // opacita del layer grana, 0..1
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Media dei cursori di un settore HSL (porta di hAvg del prototipo).
function hAvg(o: HslMap): number {
  let s = 0;
  let n = 0;
  for (const k in o) {
    s += o[k];
    n += 1;
  }
  return n ? s / n : 0;
}

// Aggregato HSL (porta di hslAgg): neutro quando tutti i cursori sono a 0
// (hue 0, sat 1, bri 1). L'HSL selettivo "vero" arrivera nella resa server.
function hslAggregate(hsl: EditState["hsl"]) {
  return {
    hue: hAvg(hsl.hue) * 0.12,
    sat: 1 + hAvg(hsl.sat) / 200,
    bri: 1 + hAvg(hsl.lum) / 240,
  };
}

export interface FilterScalars {
  gray: number;
  sep: number;
  sat: number;
  con: number;
  bri: number;
  hue: number;
  vig: number;
  grain: number;
}

// Scalari finali dei filtri, dopo aver ripiegato preset/intensita, luce, colore,
// HSL aggregato e dettaglio. UNA matematica sola, condivisa dal client
// (composeFilter -> stringa CSS) e dal server (render-pixels -> matrici colore).
export function composeScalars(s: EditState): FilterScalars {
  const k = clamp01(s.intensity);
  const p = presetByKey(s.preset);
  const lin = (v: number) => 1 + k * (v - 1);

  let sat = lin(p.sat);
  let con = lin(p.con);
  let bri = lin(p.bri);
  let sep = k * p.sep;
  const gray = k * p.gray;
  let hue = k * p.hue;

  const L = s.light;
  const C = s.color;
  const D = s.detail;

  // Luce
  bri *= (1 + L.exp / 150) * (1 + L.hi / 520) * (1 + L.sha / 520) * (1 + L.wh / 700) * (1 + L.bl / 900);
  con *= (1 + L.con / 130) * (1 - L.sha / 900) * (1 + L.wh / 650) * (1 - L.bl / 650);

  // Colore
  if (C.temp > 0) {
    sep += C.temp / 200;
    hue += -C.temp / 14;
  } else {
    hue += -C.temp * 1.4;
  }
  hue += C.tint / 6;
  sat *= (1 + C.vib / 150) * (1 + C.sat / 110);

  // Mixer HSL (aggregato): neutro a 0
  const h = hslAggregate(s.hsl);
  hue += h.hue;
  sat *= h.sat;
  bri *= h.bri;

  // Dettaglio su contrasto/saturazione: neutro a 0
  con *= (1 + D.sharp / 420) * (1 + D.clar / 220) * (1 + D.tex / 520) * (1 + D.haze / 200);
  sat *= 1 + D.haze / 320;

  const vig = clamp01(D.vig / 100);
  const grain = clamp01(Math.max(D.grain, s.grain) / 130);

  return { gray, sep, sat, con, bri, hue, vig, grain };
}

export function composeFilter(s: EditState): ComposedPreview {
  const k = composeScalars(s);
  // url(#curveFilter): feComponentTransfer per le curve. All'identita e un no-op.
  const filter =
    `grayscale(${k.gray.toFixed(3)}) sepia(${k.sep.toFixed(3)}) saturate(${k.sat.toFixed(3)}) ` +
    `contrast(${k.con.toFixed(3)}) brightness(${k.bri.toFixed(3)}) hue-rotate(${k.hue.toFixed(1)}deg) url(#curveFilter)`;
  return { filter, vig: k.vig, grain: k.grain };
}
