import sharp from "sharp";
import { embedStego } from "./stegano";

// Applica un watermark "impresso nei pixel" a un buffer immagine e restituisce JPEG.
// `width`: se c'e', l'immagine viene prima ridotta a quella larghezza (mai
// ingrandita) e la trama della filigrana scala con lei, cosi' una miniatura resta
// protetta come l'originale ma pesa una frazione.
export async function watermarkBytes(buf: Buffer, width?: number): Promise<Buffer> {
  const source = width
    ? await sharp(buf).resize({ width, withoutEnlargement: true }).toBuffer()
    : buf;
  const img = sharp(source);
  const meta = await img.metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const k = Math.max(0.45, Math.min(1, w / 1024)); // scala della trama

  // Watermark diagonale ripetuto su tutta la superficie.
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wm" width="${Math.round(360 * k)}" height="${Math.round(220 * k)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <text x="0" y="${Math.round(110 * k)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(26 * k)}" font-weight="700" fill="rgba(255,255,255,0.30)">SEMBLIC · ANTEPRIMA</text>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#wm)"/>
  </svg>`;

  return img
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

// Versione da URL: scarica e watermarka. L'URL pulito del motore NON viene mai
// esposto al client, solo questa versione protetta.
export async function watermarkBuffer(imageUrl: string, width?: number): Promise<Buffer> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error("download immagine fallito");
  return watermarkBytes(Buffer.from(await resp.arrayBuffer()), width);
}

// Variante data-URL da URL (anteprima inline, motori che restituiscono un URL).
export async function watermarkPreview(imageUrl: string): Promise<string> {
  const out = await watermarkBuffer(imageUrl);
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

// Variante data-URL da buffer (anteprima ECHO: l'immagine pulita resta in RAM,
// non viene mai caricata/esposta).
export async function watermarkPreviewBuffer(buf: Buffer): Promise<string> {
  const out = await watermarkBytes(buf);
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

// Imprime la provenienza nei metadati EXIF dell'immagine commerciale (seme C2PA):
// il certificato e l'URL di verifica viaggiano col file. Restituisce JPEG.
export async function embedProvenance(
  imageUrl: string,
  info: { certificate: string; alias: string; verifyUrl: string }
): Promise<Buffer> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error("download immagine fallito");
  const buf = Buffer.from(await resp.arrayBuffer());

  const desc = `Generato via Semblic con consenso. Avatar: ${info.alias}. Certificato: ${info.certificate}. Verifica: ${info.verifyUrl}`;
  return sharp(buf)
    .withExif({
      IFD0: {
        ImageDescription: desc,
        Copyright: "Semblic: contenuto certificato, persona reale consenziente",
        Artist: info.alias,
        Software: "Semblic",
      },
    })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// Provenienza COMPLETA: filigrana INVISIBILE (certificato nascosto nei pixel,
// steganografia) + metadati EXIF leggibili. Output PNG (lossless, necessario
// perché il codice nascosto sopravviva). È la versione "certificato" scaricabile.
export async function embedProvenancePng(
  imageUrl: string,
  info: { certificate: string; alias: string; verifyUrl: string }
): Promise<Buffer> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error("download immagine fallito");
  const buf = Buffer.from(await resp.arrayBuffer());

  // 1. Nasconde il certificato nei pixel (invisibile).
  const stego = await embedStego(buf, info.certificate);

  // 2. Aggiunge i metadati di provenienza leggibili (best-effort: se la EXIF su
  //    PNG non è supportata in runtime, restituiamo comunque il PNG marcato).
  const desc = `Generato via Semblic con consenso. Avatar: ${info.alias}. Certificato: ${info.certificate}. Verifica: ${info.verifyUrl}`;
  try {
    return await sharp(stego)
      .withExif({
        IFD0: {
          ImageDescription: desc,
          Copyright: "Semblic: contenuto certificato, persona reale consenziente",
          Artist: info.alias,
          Software: "Semblic",
        },
      })
      .png()
      .toBuffer();
  } catch {
    return stego;
  }
}
