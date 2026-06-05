import { gallerySource } from "@/lib/sample-galleries";
import { watermarkBuffer } from "@/lib/watermark";

// Serve un'immagine campione della galleria, WATERMARKATA.
// L'URL pulito del motore non lascia mai il server: il client vede solo questa.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string; index: string }> }
) {
  const { handle, index } = await params;
  const src = gallerySource(handle, parseInt(index, 10));
  if (!src) return new Response("Not found", { status: 404 });

  let buf: Buffer;
  try {
    buf = await watermarkBuffer(src);
  } catch {
    return new Response("Errore immagine", { status: 502 });
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
