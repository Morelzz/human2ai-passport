import sharp from "sharp";

// Applica un watermark "impresso nei pixel" a un'immagine di anteprima e
// restituisce un data-URL JPEG. L'URL pulito del motore NON viene mai esposto
// al client per le anteprime: il compratore riceve solo questa versione protetta.
export async function watermarkPreview(imageUrl: string): Promise<string> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error("download immagine anteprima fallito");
  const buf = Buffer.from(await resp.arrayBuffer());

  const img = sharp(buf);
  const meta = await img.metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;

  // Watermark diagonale ripetuto su tutta la superficie.
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wm" width="360" height="220" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <text x="0" y="110" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.30)">HUMAN2AI · ANTEPRIMA</text>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#wm)"/>
  </svg>`;

  const out = await img
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .jpeg({ quality: 80 })
    .toBuffer();

  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
