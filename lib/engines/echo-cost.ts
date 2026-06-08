// ──────────────────────────────────────────────────────────────────────────
// ECHO — economia del COMPUTE (costo OpenAI gpt-image-2).
//
// Modulo PURO (nessun import server-only): è sorgente unica di verità per le
// tariffe token, usato sia lato client (stima del prezzo prima di generare)
// sia lato server (costo REALE dal campo `usage` della risposta OpenAI).
//
// Il prezzo di ECHO segue il modello "compute a parte" (deciso 2026-06-08):
//   prezzo buyer = VALORE-categoria (royalty 80/20 alla persona)
//                + SUPPLEMENTO-compute (= costo OpenAI × markup → piattaforma)
// Così la royalty resta legata al valore d'uso del volto e la piattaforma non
// va mai sotto costo, qualunque risoluzione/qualità.
// ──────────────────────────────────────────────────────────────────────────

// Tariffe token gpt-image-2, in USD per 1.000.000 di token.
// ⚠️ STIMA INIZIALE (allineata all'economia gpt-image): vengono CONFERMATE dai
// token reali loggati a ogni generazione (vedi echoCostCentsFromUsage). Se il
// log mostra uno scarto, ritoccare qui.
export const USD_PER_M_OUTPUT = 40; // token immagine in uscita
export const USD_PER_M_INPUT_IMAGE = 10; // reference in ingresso (edit endpoint)
export const USD_PER_M_INPUT_TEXT = 5; // prompt testuale (trascurabile)
export const USD_TO_EUR = 0.92; // cambio prudenziale; ritoccabile

// Margine sul compute: il supplemento = costo stimato × MARKUP. A 1,6 la
// piattaforma resta in attivo anche se la stima sottovaluta il costo reale
// fino al ~60%. Knob da rivedere coi log reali.
export const ECHO_COMPUTE_MARKUP = 1.6;

// Pixel di una size "LxA" (0 se non parsabile).
export function pixelsOf(size?: string | null): number {
  if (!size) return 0;
  const m = /^(\d+)x(\d+)$/.exec(size);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

// Token immagine in USCITA a 1024×1024 per qualità (ancore note dell'economia
// gpt-image). Le altre risoluzioni scalano ~linearmente coi pixel.
const OUTPUT_TOKENS_AT_1MP: Record<string, number> = { low: 272, medium: 1056, high: 4160 };
const PX_1MP = 1024 * 1024;

// Stima dei token output per una (size, quality).
function estOutputTokens(size: string | undefined | null, quality: string): number {
  const base = OUTPUT_TOKENS_AT_1MP[quality] ?? OUTPUT_TOKENS_AT_1MP.high;
  const px = pixelsOf(size) || PX_1MP;
  return base * (px / PX_1MP);
}

// Token INPUT del reference-set: ~8 foto a ~1024px ≈ 320 token l'una (costante
// per call, indipendente dalla risoluzione d'uscita).
const REF_INPUT_TOKENS = 8 * 320;

// USD → centesimi di euro.
function usdToCents(usd: number): number {
  return usd * USD_TO_EUR * 100;
}

// COSTO STIMATO (centesimi €) di una generazione ECHO con identity-lock, PRIMA
// di chiamare l'API: serve per mostrare/addebitare il prezzo al buyer.
export function estEchoCostCents(size?: string | null, quality?: string | null): number {
  const q = quality ?? "high";
  const outUsd = (estOutputTokens(size, q) * USD_PER_M_OUTPUT) / 1_000_000;
  const inUsd = (REF_INPUT_TOKENS * USD_PER_M_INPUT_IMAGE) / 1_000_000;
  return usdToCents(outUsd + inUsd);
}

// Supplemento-compute (centesimi €) addebitato al buyer = costo stimato × markup.
export function echoSurchargeCents(size?: string | null, quality?: string | null): number {
  return Math.ceil(estEchoCostCents(size, quality) * ECHO_COMPUTE_MARKUP);
}

// Forma del campo `usage` restituito da OpenAI (images). Tutto opzionale: se
// assente, il costo reale non è calcolabile e si ricade sulla stima.
export interface EchoUsage {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { text_tokens?: number; image_tokens?: number };
}

// COSTO REALE (centesimi €) dai token effettivi della risposta. null se l'API
// non ha restituito usage utilizzabile.
export function echoCostCentsFromUsage(usage?: EchoUsage | null): number | null {
  if (!usage) return null;
  const out = usage.output_tokens ?? 0;
  const imgIn = usage.input_tokens_details?.image_tokens ?? 0;
  const txtIn = usage.input_tokens_details?.text_tokens ?? 0;
  // Fallback: se mancano i dettagli ma c'è input_tokens, trattalo come immagine.
  const inImg = imgIn || (usage.input_tokens ?? 0);
  if (!out && !inImg) return null;
  const usd =
    (out * USD_PER_M_OUTPUT) / 1_000_000 +
    (inImg * USD_PER_M_INPUT_IMAGE) / 1_000_000 +
    (txtIn * USD_PER_M_INPUT_TEXT) / 1_000_000;
  return Math.round(usdToCents(usd));
}
