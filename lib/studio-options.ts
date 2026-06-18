// lib/studio-options.ts
// ──────────────────────────────────────────────────────────────────────────
// Studio di generazione: cataloghi e token. SORGENTE DI VERITA UNICA, pura,
// importata sia dal client (picker + anteprima prompt) sia dal server
// (whitelist: mai testo libero del client come parametro fotografico).
// Nessun import di runtime client/server: solo dati e funzioni pure.
// ──────────────────────────────────────────────────────────────────────────

export interface Opt { v: string; l: string; token: string }
export interface PoseOpt extends Opt { cat: string }

// 3.9 Macchina
export const CAMERAS = [
  { v: "analogica", l: "Analogica", token: "shot on 35mm film, natural grain, warm tones" },
  { v: "full_frame", l: "Full frame", token: "full-frame digital, sharp, wide dynamic range" },
  { v: "medio_formato", l: "Medio formato", token: "medium format, extreme detail, smooth bokeh" },
  { v: "polaroid", l: "Polaroid", token: "instant Polaroid photo, white frame, vintage tones" },
] as const satisfies readonly Opt[];

// 3.9 Ottica (etichette coi mm)
export const LENSES = [
  { v: "8mm", l: "8mm", token: "8mm fisheye, ultra wide-angle" },
  { v: "12mm", l: "12mm", token: "12mm ultra wide-angle" },
  { v: "20mm", l: "20mm", token: "20mm wide-angle" },
  { v: "35mm", l: "35mm", token: "35mm reportage perspective" },
  { v: "50mm", l: "50mm", token: "50mm natural perspective" },
  { v: "85mm", l: "85mm", token: "85mm portrait lens, creamy bokeh, shallow depth of field" },
  { v: "200mm", l: "200mm", token: "200mm telephoto, compressed perspective" },
] as const satisfies readonly Opt[];

// 3.9 Luce
export const LIGHTS = [
  { v: "naturale", l: "Naturale", token: "natural light" },
  { v: "golden", l: "Golden hour", token: "golden hour warm light" },
  { v: "studio", l: "Studio", token: "studio softbox lighting" },
  { v: "controluce", l: "Controluce", token: "backlight, rim light" },
  { v: "neon", l: "Neon", token: "nighttime neon lighting" },
] as const satisfies readonly Opt[];

// 3.8 Stile colore (in generazione)
export const COLOR_STYLES = [
  { v: "naturale", l: "Naturale", token: "" },
  { v: "bn", l: "Bianco e nero", token: "black and white photography" },
  { v: "pastello", l: "Colori pastello", token: "soft pastel color palette" },
  { v: "cinematico", l: "Cinematico", token: "cinematic teal and orange color grading" },
  { v: "contrasto", l: "Contrasto forte", token: "high contrast, deep shadows" },
  { v: "flash", l: "Effetto flash", token: "direct on-camera flash, harsh flash look" },
] as const satisfies readonly Opt[];

// 3.6 Inquadratura
export const FRAMINGS = [
  { v: "primo_piano", l: "Primo piano", token: "close-up portrait, head and shoulders" },
  { v: "mezzo_busto", l: "Mezzo busto", token: "medium shot, waist up" },
  { v: "figura_intera", l: "Figura intera", token: "full-body shot" },
  { v: "americano", l: "Piano americano", token: "American shot, from the knees up" },
] as const satisfies readonly Opt[];

// 3.7 Espressione
export const EXPRESSIONS = [
  { v: "naturale", l: "Naturale", token: "" },
  { v: "sorriso", l: "Sorriso", token: "natural smile" },
  { v: "serio", l: "Serio", token: "serious expression" },
  { v: "pensieroso", l: "Pensieroso", token: "thoughtful expression" },
  { v: "risata", l: "Risata", token: "candid laughter" },
] as const satisfies readonly Opt[];

// 3.5 Pose categorizzate (token diretti, niente bucket: scelta "lista statica").
export const POSES = [
  { v: "nessuna", l: "Nessuna", token: "", cat: "Base" },
  { v: "casuale", l: "Casuale", token: "dynamic natural pose", cat: "Base" },
  { v: "in_piedi", l: "In piedi", token: "standing straight facing the camera", cat: "In piedi" },
  { v: "tre_quarti", l: "Tre quarti", token: "three-quarter turn", cat: "In piedi" },
  { v: "mani_tasca", l: "Mani in tasca", token: "hands in trouser pockets", cat: "In piedi" },
  { v: "mani_fianchi", l: "Mani sui fianchi", token: "hands on hips, power pose", cat: "In piedi" },
  { v: "braccia_conserte", l: "Braccia conserte", token: "arms crossed over the chest", cat: "In piedi" },
  { v: "mano_mento", l: "Mano al mento", token: "hand on the chin, thoughtful", cat: "In piedi" },
  { v: "al_muro", l: "Al muro", token: "leaning against a wall", cat: "In piedi" },
  { v: "profilo", l: "Profilo", token: "full side profile", cat: "In piedi" },
  { v: "braccia_aperte", l: "Braccia aperte", token: "arms open wide", cat: "In piedi" },
  { v: "sgabello", l: "Su sgabello", token: "sitting on a tall stool", cat: "Seduta" },
  { v: "a_terra", l: "A terra", token: "sitting on the floor, knee up", cat: "Seduta" },
  { v: "camminata", l: "Camminata", token: "captured mid-stride walking", cat: "Dinamica" },
  { v: "di_spalle", l: "Di spalle", token: "seen from behind, looking over the shoulder", cat: "Editoriale" },
  { v: "prodotto_mano", l: "Prodotto in mano", token: "presenting a product held in one hand", cat: "Editoriale" },
] as const satisfies readonly PoseOpt[];

// Tipi letterali derivati dai cataloghi (cambio valore in GOALS = errore di compilazione)
export type FramingVal = (typeof FRAMINGS)[number]["v"];
export type LightVal = (typeof LIGHTS)[number]["v"];
export type ColorStyleVal = (typeof COLOR_STYLES)[number]["v"];
export type LensVal = (typeof LENSES)[number]["v"];

// 3.2 Preset "Avvio per obiettivo". format mappa su ECHO_FORMATS (quadrato/verticale/orizzontale).
export interface GoalPreset {
  v: string; l: string;
  format?: string; res?: string;
  framing?: FramingVal; light?: LightVal; colorStyle?: ColorStyleVal; lens?: LensVal;
}
export const GOALS = [
  { v: "ig", l: "Post Instagram", format: "verticale", framing: "mezzo_busto", light: "naturale", colorStyle: "naturale", lens: "50mm" },
  { v: "ecom", l: "Foto prodotto", format: "quadrato", framing: "figura_intera", light: "studio", colorStyle: "naturale", lens: "50mm" },
  { v: "linkedin", l: "Ritratto LinkedIn", format: "verticale", framing: "primo_piano", light: "studio", colorStyle: "naturale", lens: "85mm" },
  { v: "adv", l: "Banner ADV", format: "orizzontale", framing: "figura_intera", light: "golden", colorStyle: "cinematico", lens: "35mm" },
  { v: "libera", l: "Scena libera" },
] as const satisfies readonly GoalPreset[];

// ── Whitelist helpers ───────────────────────────────────────────────────────
function tokenOf(list: readonly Opt[], v: unknown): string {
  if (typeof v !== "string") return "";
  return list.find((o) => o.v === v)?.token ?? "";
}
export const cameraToken = (v: unknown) => tokenOf(CAMERAS, v);
export const lensToken = (v: unknown) => tokenOf(LENSES, v);
export const lightToken = (v: unknown) => tokenOf(LIGHTS, v);
export const colorStyleToken = (v: unknown) => tokenOf(COLOR_STYLES, v);
export const framingToken = (v: unknown) => tokenOf(FRAMINGS, v);
export const expressionToken = (v: unknown) => tokenOf(EXPRESSIONS, v);
export const poseToken = (v: unknown) => tokenOf(POSES, v);

export interface PhotographicChoice {
  camera?: unknown; lens?: unknown; light?: unknown;
  colorStyle?: unknown; framing?: unknown; expression?: unknown;
}

// Segmento fotografico: "Photographed as: <stile colore>, <inquadratura>,
// <espressione>, <macchina>, <ottica>, <luce>." (solo token non vuoti, 3.12).
// Stringa vuota se nessun token: il chiamante non aggiunge nulla al prompt.
export function photographicSegment(c: PhotographicChoice): string {
  const toks = [
    colorStyleToken(c.colorStyle),
    framingToken(c.framing),
    expressionToken(c.expression),
    cameraToken(c.camera),
    lensToken(c.lens),
    lightToken(c.light),
  ].filter(Boolean);
  return toks.length ? `Photographed as: ${toks.join(", ")}.` : "";
}

// Solo i valori validi (per la persistenza DB: scartiamo input ignoti).
export function validEnum(list: readonly Opt[], v: unknown): string | null {
  return typeof v === "string" && list.some((o) => o.v === v) ? v : null;
}
