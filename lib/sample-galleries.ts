// Repertorio/galleria di immagini campione per avatar (il "repertoire" mostrato
// al posto dell'anteprima live: generate una volta, mostrate all'infinito a costo zero).
//
// Gli URL puliti del motore vivono SOLO qui (lato server): non vengono mai esposti
// al client. La galleria si serve watermarkata via /api/sample/[handle]/[index].
//
// MVP: config per handle (oggi 1 avatar reale). Quando onboardiamo avatar a scala
// (creazione Soul in-app), questa mappa diventerà una colonna su `avatars`.

export const SAMPLE_GALLERIES: Record<string, string[]> = {
  "mario-r": [
    // headshot studio (= ritratto)
    "https://d3u0tzju9qaucj.cloudfront.net/5fc448f8-f943-446d-a181-609d64f40dc2/58adbaf7-8150-473a-b5f3-47723b967660.png",
    // ritratto outdoor, t-shirt, luce naturale
    "https://d3u0tzju9qaucj.cloudfront.net/5fc448f8-f943-446d-a181-609d64f40dc2/1a8fe355-97ab-43c3-8cfe-f76186153188.png",
    // lifestyle, street style, golden hour
    "https://d3u0tzju9qaucj.cloudfront.net/5fc448f8-f943-446d-a181-609d64f40dc2/f788eeee-0669-45f9-8563-ed63401329fe.png",
  ],
};

export function galleryCount(handle: string): number {
  return SAMPLE_GALLERIES[handle]?.length ?? 0;
}

export function gallerySource(handle: string, index: number): string | null {
  const urls = SAMPLE_GALLERIES[handle];
  if (!urls || index < 0 || index >= urls.length) return null;
  return urls[index];
}
