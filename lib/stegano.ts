import sharp from "sharp";
import { extractCertFromRGBA, embedCertIntoRGBA } from "./stegano-core";

// ──────────────────────────────────────────────────────────────────────────
// Filigrana INVISIBILE (steganografia LSB) — lato SERVER.
// Nasconde un codice segreto (il certificato) in UN solo canale (blu, il meno
// percepibile) e lo SPARGE su tutta l'immagine con una sequenza pseudo-casuale
// deterministica → densità bassissima, invisibile anche zoomando.
//
// Qui sta SOLO l'I/O con sharp (PNG ↔ raw RGBA): l'algoritmo dei bit vive in
// `stegano-core` (puro, isomorfo), condiviso con la lettura nel browser.
//
// Richiede PNG (lossless): sopravvive a copia/salvataggio PNG, NON a JPEG/resize
// (per quello servirà un watermark robusto in frequenza, servizio dedicato).
// ──────────────────────────────────────────────────────────────────────────

// Nasconde `payload` (stringa) nei pixel di `input` → ritorna PNG.
export async function embedStego(input: Buffer, payload: string): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info; // channels = 4 (RGBA)
  const ok = embedCertIntoRGBA(data, width * height, payload);
  if (!ok) throw new Error("payload troppo grande per questa immagine");
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Estrae il payload nascosto, o null se l'immagine non è marcata/è stata ricompressa.
export async function extractStego(input: Buffer): Promise<string | null> {
  let raw;
  try {
    raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch {
    return null;
  }
  const { data, info } = raw;
  return extractCertFromRGBA(data, info.width * info.height);
}
