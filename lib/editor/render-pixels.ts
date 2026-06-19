// ──────────────────────────────────────────────────────────────────────────
// Resa server delle modifiche dell'editor: usa la STESSA pipeline a pixel reali
// dell'anteprima canvas (lib/editor/pipeline.processImage), su sharp raw a piena
// risoluzione. Cosi il download combacia esattamente con l'anteprima.
// ──────────────────────────────────────────────────────────────────────────

import sharp from "sharp";
import type { EditState } from "@/lib/editor/types";
import { processImage } from "@/lib/editor/pipeline";

export async function renderEditedPng(cleanBuf: Buffer, state: EditState): Promise<Buffer> {
  const { data, info } = await sharp(cleanBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info; // channels = 4 (ensureAlpha)
  // Vista RGBA clampata sugli stessi byte del Buffer: processImage muta in place.
  const view = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  processImage(view, width, height, state);
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}
