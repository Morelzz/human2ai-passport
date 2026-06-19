// Perceptual hash (dHash) per le evidenze: identita' robusta di un'immagine,
// resistente a piccole modifiche (ricompressione, resize). dhash e' PURO sui
// pixel; la decodifica (sharp) sta in phashOf.

// Confronto orizzontale di pixel grigi adiacenti. gray e' row-major, lunghezza
// w*h. Produce (w-1)*h bit -> hex (MSB-first, ultima nibble paddata a destra).
export function dhash(gray: number[], w: number, h: number): string {
  let bits = "";
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w - 1; c++) {
      bits += gray[r * w + c] > gray[r * w + c + 1] ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4).padEnd(4, "0"), 2).toString(16);
  }
  return hex;
}

// Decodifica i bytes (sharp), grigio 9x8, poi dhash -> 16 hex (64 bit). Robusto
// sul numero di canali del raw grayscale (prende il primo canale per pixel).
export async function phashOf(imageBytes: Uint8Array): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharpMod: any = await import("sharp");
  const sharp = sharpMod.default ?? sharpMod;
  const { data, info } = await sharp(Buffer.from(imageBytes))
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels as number;
  const gray: number[] = [];
  for (let i = 0; i < 9 * 8; i++) gray.push(data[i * ch]);
  return dhash(gray, 9, 8);
}
