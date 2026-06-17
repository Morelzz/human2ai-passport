// Lettura della filigrana invisibile SUL DISPOSITIVO (browser).
//
// Perché qui e non sempre sul server: Vercel rifiuta i body oltre ~4,5MB (413),
// e le foto/PNG grandi li superano. Per quei file leggiamo la filigrana nel
// browser, a risoluzione NATIVA (mai ridimensionati: un resize distruggerebbe i
// LSB), e al server mandiamo solo il certificato.
//
// L'estrazione usa lib/stegano-core (la STESSA del server): l'ImageData del
// canvas ha lo stesso layout RGBA del raw di sharp, e per i PNG opachi senza
// profilo ICC (i contenuti Semblic) i byte coincidono → lettura 1:1.
import { extractCertFromRGBA } from "./stegano-core";

/** Legge il certificato dalla filigrana invisibile di un PNG, sul dispositivo.
 *  Ritorna null se non è un PNG, non è marcato, o i pixel non sono leggibili
 *  (canvas troppo grande/errore). Non lancia mai. */
export async function readWatermarkFromFile(file: File): Promise<string | null> {
  // Solo PNG: la filigrana vive nei LSB di un PNG lossless.
  if (file.type !== "image/png") return null;
  try {
    const imageData = await rasterizeNative(file);
    if (!imageData) return null;
    return extractCertFromRGBA(imageData.data, imageData.width * imageData.height);
  } catch {
    return null;
  }
}

// Disegna l'immagine a risoluzione nativa su un canvas e ne legge i pixel RGBA.
async function rasterizeNative(file: File): Promise<ImageData | null> {
  // createImageBitmap: decodifica veloce (spesso off-thread), dà le dimensioni native.
  // colorSpaceConversion:"none" → niente color management del browser: i pixel del
  // canvas restano i byte ESATTI del PNG (la filigrana vive nei LSB; ogni conversione
  // cromatica li altererebbe e la lettura on-device divergerebbe dal server).
  try {
    const bitmap = await createImageBitmap(file, { colorSpaceConversion: "none" });
    try {
      const ctx = makeContext(bitmap.width, bitmap.height);
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    } finally {
      bitmap.close?.();
    }
  } catch {
    // Fallback <img> (browser senza createImageBitmap o decodifica fallita).
    return viaImgElement(file);
  }
}

function makeContext(w: number, h: number): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // willReadFrequently: lettura pixel ottimizzata; niente smoothing (disegno 1:1).
  return canvas.getContext("2d", { willReadFrequently: true });
}

async function viaImgElement(file: File): Promise<ImageData | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // garantisce i pixel pronti prima di getImageData
    const ctx = makeContext(img.naturalWidth, img.naturalHeight);
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
