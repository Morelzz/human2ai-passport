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

// Repertorio di Random (handle 'random', ex 'mario-r') RIGENERATO con ECHO
// (identity-lock, 2026-06-10, scelta Morelz: più fedele del vecchio set
// Higgsfield). File su Supabase Storage `generations/repertorio/random/`: [0]
// è anche il ritratto. La chiave 'mario-r' resta come alias storico finché il
// rename non è stabile e i vecchi link non scadono (pulizia successiva).
// Casa nuova (2026-09-14): repertori RIGENERATI con gpt-image-2.5-flare, 4 scene
// uguali per tutti (studio su avorio, finestra, editoriale scura, citta' al
// tramonto), in repertorio-v2/. La fonte vera resta avatars.gallery_urls: questa
// mappa e' solo il ripiego storico.
const SUPA = "https://ktjebfavzherochwhtis.supabase.co/storage/v1/object/public/generations/repertorio-v2";
const SAMPLE_GALLERIES: Record<string, string[]> = {
  random: [
    `${SUPA}/random/00.png`, // studio su avorio (= ritratto)
    `${SUPA}/random/01.png`, // luce di finestra
    `${SUPA}/random/02.png`, // editoriale scura
    `${SUPA}/random/03.png`, // citta' al tramonto
  ],
  "mario-r": [
    `${SUPA}/mario-r/00.png`,
    `${SUPA}/mario-r/01.png`,
    `${SUPA}/mario-r/02.png`,
    `${SUPA}/mario-r/03.png`,
  ],
  // Ambassador (2026-06-11): repertori ECHO con identity-lock.
  asia: [
    `${SUPA}/asia/00.png`, // studio su avorio (= ritratto)
    `${SUPA}/asia/01.png`, // luce di finestra
    `${SUPA}/asia/02.png`, // editoriale scura
    `${SUPA}/asia/03.png`, // citta' al tramonto
  ],
  gabriella: [
    `${SUPA}/gabriella/00.png`, // studio su avorio (= ritratto)
    `${SUPA}/gabriella/01.png`, // luce di finestra
    `${SUPA}/gabriella/02.png`, // editoriale scura
    `${SUPA}/gabriella/03.png`, // citta' al tramonto
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
