import { createServerClient } from "@/lib/supabase";
import { galleryFromRow } from "@/lib/sample-galleries";
import sharp from "sharp";
import { sampleWidth } from "@/lib/sample-size";

// Serve un'immagine campione della galleria, ridimensionata.
// 27/9/2026: niente piu' filigrana visibile "SEMBLIC · ANTEPRIMA" (decisione di
// Morelz): le foto del registro sono la vetrina delle persone che hanno detto
// si', e la scritta sopra le rovinava. La prova di provenienza resta la
// filigrana invisibile dei contenuti certificati (Sigil).
// Fonte: avatars.gallery_urls (fallback: mappa storica in lib/sample-galleries).
export async function GET(
  req: Request,
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
    // ?w= fra le larghezze ammesse: miniatura leggera.
    const res = await fetch(src);
    if (!res.ok) throw new Error(`sorgente ${res.status}`);
    const w = sampleWidth(new URL(req.url).searchParams.get("w")) ?? undefined;
    buf = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(w ? { width: w, withoutEnlargement: true } : undefined).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  } catch {
    return new Response("Errore immagine", { status: 502 });
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      // s-maxage: la CDN di Vercel tiene la versione ridimensionata, calcolata
      // una volta per immagine e larghezza, non a ogni visitatore.
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
    },
  });
}
