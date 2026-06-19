// ──────────────────────────────────────────────────────────────────────────
// Motore immagine dell'editor: pipeline a PIXEL REALI, condivisa dall'anteprima
// (canvas, client) e dalla resa finale (sharp, server). Cosi i parametri
// funzionano DAVVERO e l'anteprima combacia con l'export.
//   1. Matrice colore (preset + luce + tinta + vividezza/saturazione + foschia)
//   2. Curve (LUT per canale, master RGB composta)
//   3. Temperatura (vero bilanciamento R/B: + caldo, - freddo)
//   4. Mixer HSL SELETTIVO (per gamma di tinta, colore per colore)
//   5. Nitidezza / Chiarezza / Texture (unsharp mask reale, convoluzione)
//   6. Vignettatura e grana
// Mutazione in place su un Uint8ClampedArray RGBA.
// ──────────────────────────────────────────────────────────────────────────

import type { EditState } from "@/lib/editor/types";
import { presetByKey, HSL_COLORS } from "@/lib/editor/types";
import { evalCurve } from "@/lib/editor/curves";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ── 1. Scalari della matrice (solo le operazioni esprimibili come matrice) ──
interface MatScalars {
  gray: number;
  sep: number;
  sat: number;
  con: number;
  bri: number;
  hue: number;
}
function matrixScalars(s: EditState): MatScalars {
  const k = clamp01(s.intensity);
  const p = presetByKey(s.preset);
  const lin = (v: number) => 1 + k * (v - 1);
  let sat = lin(p.sat);
  let con = lin(p.con);
  let bri = lin(p.bri);
  const sep = k * p.sep;
  const gray = k * p.gray;
  let hue = k * p.hue;
  const L = s.light;
  const C = s.color;
  const D = s.detail;
  bri *= (1 + L.exp / 150) * (1 + L.hi / 520) * (1 + L.sha / 520) * (1 + L.wh / 700) * (1 + L.bl / 900);
  con *= (1 + L.con / 130) * (1 - L.sha / 900) * (1 + L.wh / 650) * (1 - L.bl / 650);
  hue += C.tint / 6;
  sat *= (1 + C.vib / 150) * (1 + C.sat / 110);
  // Foschia: dehaze mite (contrasto + saturazione)
  con *= 1 + D.haze / 200;
  sat *= 1 + D.haze / 320;
  return { gray, sep, sat, con, bri, hue };
}

// ── matrici affine 3x4 (in 0..1), composte nell'ordine CSS ──
type Mat = number[];
const IDENT: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function mul(A: Mat, B: Mat): Mat {
  const C = new Array(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += A[r * 4 + k] * B[k * 4 + c];
      C[r * 4 + c] = s;
    }
    let off = A[r * 4 + 3];
    for (let k = 0; k < 3; k++) off += A[r * 4 + k] * B[k * 4 + 3];
    C[r * 4 + 3] = off;
  }
  return C;
}
function lerpMat(t3: number[], a: number): Mat {
  const m: Mat = new Array(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const id = r === c ? 1 : 0;
      m[r * 4 + c] = id + a * (t3[r * 3 + c] - id);
    }
    m[r * 4 + 3] = 0;
  }
  return m;
}
const LUMA = [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722];
const SEPIA = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131];
function saturateMat(s: number): Mat {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0,
  ];
}
function hueRotateMat(deg: number): Mat {
  const r = (deg * Math.PI) / 180;
  const a = Math.cos(r);
  const b = Math.sin(r);
  return [
    0.213 + a * 0.787 - b * 0.213, 0.715 - a * 0.715 - b * 0.715, 0.072 - a * 0.072 + b * 0.928, 0,
    0.213 - a * 0.213 + b * 0.143, 0.715 + a * 0.285 + b * 0.14, 0.072 - a * 0.072 - b * 0.283, 0,
    0.213 - a * 0.213 - b * 0.787, 0.715 - a * 0.715 + b * 0.715, 0.072 + a * 0.928 + b * 0.072, 0,
  ];
}
function colorMatrix(sc: MatScalars): Mat {
  let m: Mat = IDENT;
  m = mul(lerpMat(LUMA, Math.max(0, Math.min(1, sc.gray))), m); // grayscale
  m = mul(lerpMat(SEPIA, Math.max(0, Math.min(1, sc.sep))), m); // sepia
  m = mul(saturateMat(sc.sat), m); // saturate
  const o = 0.5 - 0.5 * sc.con;
  m = mul([sc.con, 0, 0, o, 0, sc.con, 0, o, 0, 0, sc.con, o], m); // contrast
  m = mul([sc.bri, 0, 0, 0, 0, sc.bri, 0, 0, 0, 0, sc.bri, 0], m); // brightness
  m = mul(hueRotateMat(sc.hue), m); // hue-rotate
  return m;
}

// ── 2. Curve LUT (master RGB composta sopra ogni canale) ──
function lut(state: EditState, ch: "r" | "g" | "b"): Uint8ClampedArray {
  const t = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const out = evalCurve(state.curves.rgb, evalCurve(state.curves[ch], v / 255));
    t[v] = Math.round(clamp01(out) * 255);
  }
  return t;
}
function curvesActive(state: EditState): boolean {
  const id = (p: [number, number][]) => p.length === 2 && p[0][0] === 0 && p[0][1] === 0 && p[1][0] === 100 && p[1][1] === 100;
  return !(id(state.curves.rgb) && id(state.curves.r) && id(state.curves.g) && id(state.curves.b));
}

// ── 4. Mixer HSL selettivo: centri di tinta degli 8 colori ──
const HUE_CENTERS: Record<string, number> = {
  red: 0, orange: 30, yellow: 60, green: 135, aqua: 180, blue: 225, purple: 275, magenta: 320,
};
function angDist(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
// RGB(0..255) <-> HSL(h 0..360, s/l 0..1)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  s = clamp01(s); l = clamp01(l);
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

// ── pipeline principale ──
export function processImage(data: Uint8ClampedArray, width: number, height: number, state: EditState): void {
  const sc = matrixScalars(state);
  const M = colorMatrix(sc);
  const hasCurves = curvesActive(state);
  const lR = hasCurves ? lut(state, "r") : null;
  const lG = hasCurves ? lut(state, "g") : null;
  const lB = hasCurves ? lut(state, "b") : null;

  // Temperatura: vero bilanciamento R/B (no rotazione di tinta).
  const tmp = state.color.temp / 100; // -1..1
  const tR = 1 + 0.35 * tmp, tB = 1 - 0.35 * tmp, tG = 1 + 0.06 * tmp;
  const hasTemp = state.color.temp !== 0;

  // Mixer HSL selettivo: attivo solo se qualche cursore != 0.
  let hasHsl = false;
  for (const c of HSL_COLORS) if (state.hsl.hue[c.key] || state.hsl.sat[c.key] || state.hsl.lum[c.key]) hasHsl = true;

  const px = width * height;
  for (let i = 0; i < px; i++) {
    const j = i * 4;
    let r = data[j] / 255, g = data[j + 1] / 255, b = data[j + 2] / 255;
    // 1. matrice colore
    let R = clamp255((M[0] * r + M[1] * g + M[2] * b + M[3]) * 255);
    let G = clamp255((M[4] * r + M[5] * g + M[6] * b + M[7]) * 255);
    let B = clamp255((M[8] * r + M[9] * g + M[10] * b + M[11]) * 255);
    // 2. curve
    if (hasCurves) { R = lR![R | 0]; G = lG![G | 0]; B = lB![B | 0]; }
    // 3. temperatura
    if (hasTemp) { R = clamp255(R * tR); G = clamp255(G * tG); B = clamp255(B * tB); }
    // 4. HSL selettivo
    if (hasHsl) {
      const [h, s, l] = rgbToHsl(R, G, B);
      if (s > 0.04) {
        let wsum = 0, hueAdd = 0, satMul = 0, lumAdd = 0;
        for (const c of HSL_COLORS) {
          const w = Math.max(0, 1 - angDist(h, HUE_CENTERS[c.key]) / 50);
          if (w <= 0) continue;
          wsum += w;
          hueAdd += w * (state.hsl.hue[c.key] * 0.4); // ±40°
          satMul += w * (state.hsl.sat[c.key] / 100); // ±1
          lumAdd += w * (state.hsl.lum[c.key] / 333); // ±0.3
        }
        if (wsum > 0) {
          hueAdd /= wsum; satMul /= wsum; lumAdd /= wsum;
          const [nr, ng, nb] = hslToRgb(h + hueAdd, s * (1 + satMul), l + lumAdd);
          R = nr; G = ng; B = nb;
        }
      }
    }
    data[j] = R; data[j + 1] = G; data[j + 2] = B;
  }

  // 5. Nitidezza / Chiarezza / Texture: unsharp mask reale (convoluzione).
  const sharp = state.detail.sharp, clar = state.detail.clar, tex = state.detail.tex;
  if (sharp !== 0 || clar !== 0 || tex !== 0) {
    unsharp(data, width, height, (sharp * 1.1 + tex * 0.7) / 100, 1); // alta frequenza (raggio 1)
    if (clar !== 0) unsharp(data, width, height, (clar * 0.8) / 100, 2); // chiarezza (raggio 2, contrasto locale)
  }

  // 6. Vignettatura + grana
  const vig = clamp01(state.detail.vig / 100);
  const grain = clamp01(Math.max(state.detail.grain, state.grain) / 130);
  if (vig > 0 || grain > 0) {
    const cx = width / 2, cy = height / 2, rx = width * 0.6, ry = height * 0.6;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const j = (y * width + x) * 4;
        if (vig > 0) {
          const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
          const f = 1 - Math.max(0, Math.min(1, (d - 0.55) / 0.45)) * 0.85 * vig;
          data[j] *= f; data[j + 1] *= f; data[j + 2] *= f;
        }
        if (grain > 0) {
          const f = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const n = (f - Math.floor(f) - 0.5) * grain * 64;
          data[j] = clamp255(data[j] + n); data[j + 1] = clamp255(data[j + 1] + n); data[j + 2] = clamp255(data[j + 2] + n);
        }
      }
    }
  }
}

// Unsharp mask: out = in + amount*(in - blur). blur = box di raggio `rad`.
function unsharp(data: Uint8ClampedArray, width: number, height: number, amount: number, rad: number): void {
  if (amount === 0) return;
  const src = data.slice();
  const n = (2 * rad + 1) * (2 * rad + 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sr = 0, sg = 0, sb = 0;
      for (let dy = -rad; dy <= rad; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -rad; dx <= rad; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          const k = (yy * width + xx) * 4;
          sr += src[k]; sg += src[k + 1]; sb += src[k + 2];
        }
      }
      const j = (y * width + x) * 4;
      data[j] = clamp255(src[j] + amount * (src[j] - sr / n));
      data[j + 1] = clamp255(src[j + 1] + amount * (src[j + 1] - sg / n));
      data[j + 2] = clamp255(src[j + 2] + amount * (src[j + 2] - sb / n));
    }
  }
}
