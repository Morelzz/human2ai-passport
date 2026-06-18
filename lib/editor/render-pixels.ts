// ──────────────────────────────────────────────────────────────────────────
// Resa server FEDELE delle modifiche dell'editor sui pixel reali.
// Ricostruisce la STESSA pipeline dell'anteprima CSS: compone le matrici dei
// filtri CSS (grayscale, sepia, saturate, contrast, brightness, hue-rotate)
// usando gli scalari di composeScalars, poi applica la LUT delle curve e infine
// vignettatura e grana. Lavora in sRGB 0..255 come il browser.
// Usato dalla route /api/edit/render (download/upscale dell'immagine modificata).
// ──────────────────────────────────────────────────────────────────────────

import sharp from "sharp";
import type { EditState } from "@/lib/editor/types";
import { composeScalars } from "@/lib/editor/preview";
import { evalCurve } from "@/lib/editor/curves";

// Matrice affine 3x4 (3x3 + colonna offset), flat di 12 numeri, in 0..1.
type Mat = number[];

const IDENT: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

// C = A·B (applica prima B poi A) su matrici affine 3x4.
function mul(A: Mat, B: Mat): Mat {
  const C = new Array(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += A[r * 4 + k] * B[k * 4 + c];
      C[r * 4 + c] = s;
    }
    // offset: A.R · B.t + A.t
    let off = A[r * 4 + 3];
    for (let k = 0; k < 3; k++) off += A[r * 4 + k] * B[k * 4 + 3];
    C[r * 4 + 3] = off;
  }
  return C;
}

// lerp tra identita e una matrice 3x3 (per grayscale/sepia).
function lerpMat(target3x3: number[], amount: number): Mat {
  const m: Mat = new Array(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const id = r === c ? 1 : 0;
      m[r * 4 + c] = id + amount * (target3x3[r * 3 + c] - id);
    }
    m[r * 4 + 3] = 0;
  }
  return m;
}

const LUMA = [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722];
const SEPIA = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131];

function grayscaleMat(g: number): Mat {
  return lerpMat(LUMA, Math.max(0, Math.min(1, g)));
}
function sepiaMat(p: number): Mat {
  return lerpMat(SEPIA, Math.max(0, Math.min(1, p)));
}
function saturateMat(s: number): Mat {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0,
  ];
}
function contrastMat(c: number): Mat {
  const o = 0.5 - 0.5 * c;
  return [c, 0, 0, o, 0, c, 0, o, 0, 0, c, o];
}
function brightnessMat(b: number): Mat {
  return [b, 0, 0, 0, 0, b, 0, 0, 0, 0, b, 0];
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

// Matrice colore composta nell'ordine CSS: grayscale -> sepia -> saturate ->
// contrast -> brightness -> hue-rotate (la prima applicata e' la piu' a destra).
function colorMatrix(sc: ReturnType<typeof composeScalars>): Mat {
  let m: Mat = IDENT;
  m = mul(grayscaleMat(sc.gray), m);
  m = mul(sepiaMat(sc.sep), m);
  m = mul(saturateMat(sc.sat), m);
  m = mul(contrastMat(sc.con), m);
  m = mul(brightnessMat(sc.bri), m);
  m = mul(hueRotateMat(sc.hue), m);
  return m;
}

// LUT 256 per un canale: master RGB composta sopra il canale (come curveTables).
function channelLut(state: EditState, ch: "r" | "g" | "b"): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    const out = evalCurve(state.curves.rgb, evalCurve(state.curves[ch], t));
    lut[v] = Math.round(Math.max(0, Math.min(1, out)) * 255);
  }
  return lut;
}

// Rumore deterministico (no Math.random, cosi e' riproducibile): hash 2D.
function noiseAt(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n)) - 0.5; // -0.5..0.5
}

// Applica la pipeline dell'editor a un buffer immagine, restituisce un PNG.
export async function renderEditedPng(cleanBuf: Buffer, state: EditState): Promise<Buffer> {
  const src = sharp(cleanBuf).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info; // channels = 4 (ensureAlpha)

  const sc = composeScalars(state);
  const M = colorMatrix(sc);
  const lutR = channelLut(state, "r");
  const lutG = channelLut(state, "g");
  const lutB = channelLut(state, "b");

  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.6; // raggio gradiente (120% / 2)
  const ry = height * 0.6;
  const vig = sc.vig; // 0..1
  const grain = sc.grain; // 0..1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      // 0..1
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      // matrice colore
      let nr = M[0] * r + M[1] * g + M[2] * b + M[3];
      let ng = M[4] * r + M[5] * g + M[6] * b + M[7];
      let nb = M[8] * r + M[9] * g + M[10] * b + M[11];
      // clamp -> 0..255
      let R = Math.round(Math.max(0, Math.min(1, nr)) * 255);
      let G = Math.round(Math.max(0, Math.min(1, ng)) * 255);
      let B = Math.round(Math.max(0, Math.min(1, nb)) * 255);
      // curve (LUT)
      R = lutR[R];
      G = lutG[G];
      B = lutB[B];
      // vignettatura: scuro radiale verso i bordi
      if (vig > 0) {
        const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
        const dark = Math.max(0, Math.min(1, (d - 0.55) / 0.45)) * 0.85 * vig;
        const f = 1 - dark;
        R *= f;
        G *= f;
        B *= f;
      }
      // grana: rumore luminanza
      if (grain > 0) {
        const n = noiseAt(x, y) * grain * 64;
        R += n;
        G += n;
        B += n;
      }
      data[i] = R < 0 ? 0 : R > 255 ? 255 : R;
      data[i + 1] = G < 0 ? 0 : G > 255 ? 255 : G;
      data[i + 2] = B < 0 ? 0 : B > 255 ? 255 : B;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}
