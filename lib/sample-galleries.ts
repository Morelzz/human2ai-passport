import { avatarArt } from "./avatar-art";

// Repertorio/galleria di immagini campione per avatar (il "repertoire" mostrato
// al posto dell'anteprima live: generate una volta, mostrate all'infinito a costo zero).
//
// FONTE: la colonna `avatars.gallery_urls` (migrazione avatar_public_profile.sql)
// — un avatar nuovo si gestisce con UNA riga, zero codice. La mappa qui sotto
// resta come FALLBACK storico finché la colonna è vuota (e pre-migrazione).
//
// Gli URL puliti non vengono mai esposti al client: la galleria si serve
// watermarkata via /api/sample/[handle]/[index].
// Modulo PURO (niente import server): usabile anche dai client component.

const SAMPLE_GALLERIES: Record<string, string[]> = {
  "mario-r": [
    // headshot studio (= ritratto)
    "https://d3u0tzju9qaucj.cloudfront.net/5fc448f8-f943-446d-a181-609d64f40dc2/58adbaf7-8150-473a-b5f3-47723b967660.png",
    // ritratto outdoor, t-shirt, luce naturale
    "https://d3u0tzju9qaucj.cloudfront.net/5fc448f8-f943-446d-a181-609d64f40dc2/1a8fe355-97ab-43c3-8cfe-f76186153188.png",
    // lifestyle, street style, golden hour
    "https://d3u0tzju9qaucj.cloudfront.net/5fc448f8-f943-446d-a181-609d64f40dc2/f788eeee-0669-45f9-8563-ed63401329fe.png",
  ],
};

/** Galleria di un avatar a partire dalla sua riga (gallery_urls se valorizzata,
 *  altrimenti la mappa fallback). Pura: chi ha già la riga non rifà query. */
export function galleryFromRow(handle: string, galleryUrls?: unknown): string[] {
  if (Array.isArray(galleryUrls)) {
    const urls = galleryUrls.filter((u): u is string => typeof u === "string" && u.length > 0);
    if (urls.length > 0) return urls;
  }
  return SAMPLE_GALLERIES[handle] ?? [];
}

/** REGOLA UNICA del ritratto: un avatar con galleria mostra il volto reale
 *  (watermarkato, via route interna); gli altri l'avatar-art locale.
 *  Generalizza il vecchio caso speciale mario-r: vale anche per gli ambassador. */
export function portraitFor(a: { handle: string; alias: string; gallery_urls?: unknown }): string {
  return galleryFromRow(a.handle, a.gallery_urls).length > 0
    ? `/api/sample/${a.handle}/0`
    : avatarArt(a.handle, a.alias);
}
