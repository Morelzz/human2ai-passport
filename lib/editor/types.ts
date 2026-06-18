// ──────────────────────────────────────────────────────────────────────────
// Semblic Editor: stato e cataloghi. SORGENTE DI VERITA, pura, importabile
// client (anteprima) e server (resa finale con sharp, fase successiva).
// Valori portati FEDELMENTE dal prototipo design/anteprima_editor_mobile.html
// (PRESETS, SECTIONS, HCOLORS). Editing NON distruttivo: lo stato e tutto qui.
// ──────────────────────────────────────────────────────────────────────────

// ── Preset (12) ─────────────────────────────────────────────────────────────
// 7 parametri base (spec 4.3): sat, con, bri, sep(ia), gray(scale), hue, grain(flag).
export interface Preset {
  key: string;
  label: string;
  sat: number;
  con: number;
  bri: number;
  sep: number;
  gray: number;
  hue: number;
  grain: number; // 0/1: il preset porta grana
}

export const PRESETS: Preset[] = [
  { key: "naturale", label: "Naturale", sat: 1, con: 1, bri: 1, sep: 0, gray: 0, hue: 0, grain: 0 },
  { key: "pastello", label: "Pastello", sat: 0.8, con: 0.92, bri: 1.08, sep: 0.12, gray: 0, hue: 0, grain: 0 },
  { key: "contrasto", label: "Contrasto", sat: 1.12, con: 1.4, bri: 0.98, sep: 0, gray: 0, hue: 0, grain: 0 },
  { key: "bn", label: "Bianco e nero", sat: 1, con: 1.15, bri: 1, sep: 0, gray: 1, hue: 0, grain: 0 },
  { key: "cinema", label: "Cinema", sat: 1.05, con: 1.18, bri: 1, sep: 0.18, gray: 0, hue: -8, grain: 1 },
  { key: "vintage", label: "Vintage", sat: 0.82, con: 0.9, bri: 1.06, sep: 0.28, gray: 0, hue: 0, grain: 1 },
  { key: "dorato", label: "Dorato", sat: 1.2, con: 1.05, bri: 1.04, sep: 0.25, gray: 0, hue: -12, grain: 0 },
  { key: "freddo", label: "Freddo", sat: 1.1, con: 1.08, bri: 0.96, sep: 0, gray: 0, hue: 200, grain: 0 },
  { key: "seppia", label: "Seppia", sat: 0.9, con: 1, bri: 1, sep: 0.85, gray: 0, hue: 0, grain: 0 },
  { key: "matte", label: "Matte", sat: 0.9, con: 0.88, bri: 1.05, sep: 0, gray: 0, hue: 0, grain: 0 },
  { key: "hdr", label: "HDR", sat: 1.5, con: 1.22, bri: 1.02, sep: 0, gray: 0, hue: 0, grain: 0 },
  { key: "cross", label: "Cross", sat: 1.3, con: 1.12, bri: 1, sep: 0, gray: 0, hue: 30, grain: 0 },
];

export function presetByKey(key: string): Preset {
  return PRESETS.find((p) => p.key === key) ?? PRESETS[0];
}

// ── Sezioni a cursori ───────────────────────────────────────────────────────
// [chiave, etichetta, min?, max?] (default -100..100). Spec 4.4/4.5/4.7.
export type SliderDef = readonly [key: string, label: string, min?: number, max?: number];

export const LIGHT: SliderDef[] = [
  ["exp", "Esposizione"],
  ["con", "Contrasto"],
  ["hi", "Alte luci"],
  ["sha", "Ombre"],
  ["wh", "Bianchi"],
  ["bl", "Neri"],
];

export const COLOR: SliderDef[] = [
  ["temp", "Temperatura"],
  ["tint", "Tinta"],
  ["vib", "Vividezza"],
  ["sat", "Saturazione"],
];

export const DETAIL: SliderDef[] = [
  ["sharp", "Nitidezza"],
  ["clar", "Chiarezza"],
  ["tex", "Texture"],
  ["haze", "Foschia"],
  ["vig", "Vignettatura", 0, 100],
  ["grain", "Grana", 0, 100],
];

// ── Mixer colore HSL (8 colori, spec 4.6) ───────────────────────────────────
export interface HslColor {
  key: string;
  label: string;
  swatch: string;
}
export const HSL_COLORS: HslColor[] = [
  { key: "red", label: "Rosso", swatch: "#e0584f" },
  { key: "orange", label: "Arancione", swatch: "#e0894f" },
  { key: "yellow", label: "Giallo", swatch: "#d8c24a" },
  { key: "green", label: "Verde", swatch: "#5aa86f" },
  { key: "aqua", label: "Acqua", swatch: "#4fb0b0" },
  { key: "blue", label: "Blu", swatch: "#5a83c0" },
  { key: "purple", label: "Viola", swatch: "#8a6cc0" },
  { key: "magenta", label: "Magenta", swatch: "#c05a9a" },
];

// ── Stato dell'editor (spec sezione 6) ──────────────────────────────────────
export type HslMap = Record<string, number>;
export type CurvePoint = [number, number]; // x,y in 0..100
export interface Curves {
  rgb: CurvePoint[];
  r: CurvePoint[];
  g: CurvePoint[];
  b: CurvePoint[];
}

export interface EditState {
  preset: string; // key di PRESETS
  intensity: number; // 0..1 (default 0.85)
  grain: number; // grana manuale master 0..100
  light: { exp: number; con: number; hi: number; sha: number; wh: number; bl: number };
  color: { temp: number; tint: number; vib: number; sat: number };
  detail: { sharp: number; clar: number; tex: number; haze: number; vig: number; grain: number };
  hsl: { hue: HslMap; sat: HslMap; lum: HslMap };
  curves: Curves;
}

function zeroHsl(): HslMap {
  const m: HslMap = {};
  for (const c of HSL_COLORS) m[c.key] = 0;
  return m;
}
function identityCurve(): CurvePoint[] {
  return [
    [0, 0],
    [100, 100],
  ];
}

export function defaultEditState(): EditState {
  return {
    preset: "naturale",
    intensity: 0.85,
    grain: 0,
    light: { exp: 0, con: 0, hi: 0, sha: 0, wh: 0, bl: 0 },
    color: { temp: 0, tint: 0, vib: 0, sat: 0 },
    detail: { sharp: 0, clar: 0, tex: 0, haze: 0, vig: 0, grain: 0 },
    hsl: { hue: zeroHsl(), sat: zeroHsl(), lum: zeroHsl() },
    curves: { rgb: identityCurve(), r: identityCurve(), g: identityCurve(), b: identityCurve() },
  };
}
