import { createServerClient } from "@/lib/supabase";
import { galleryFromRow } from "@/lib/sample-galleries";
import { watermarkBuffer } from "@/lib/watermark";

// Serve un'immagine campione della galleria, WATERMARKATA.
// L'URL pulito del motore non lascia mai il server: il client vede solo questa.
// Fonte: avatars.gallery_urls (fallback: mappa storica in lib/sample-galleries).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string; index: string }> }
) {
  const { handle, index } = await params;

  // Difensivo pre-migrazione: se la colonna non esiste la query fallisce
  // senza lanciare e si usa il fallback (galleryFromRow con undefined).
  let fromDb: unknown;
  try {
    const sb = createServerClient();
    const { data } = await sb.from("avatars").select("gallery_urls").eq("handle", handle).maybeSingle();
    fromDb = (data as { gallery_urls?: unknown } | null)?.gallery_urls;
  } catch {
    /* storage/DB non disponibile: fallback mappa */
  }

  const urls = galleryFromRow(handle, fromDb);
  const i = parseInt(index, 10);
  const src = Number.isInteger(i) && i >= 0 && i < urls.length ? urls[i] : null;
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
