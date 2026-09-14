// Larghezze delle immagini campione filigranate (/api/sample/[handle]/[index]).
// Modulo PURO. Una miniatura del registro non deve scaricare l'originale da
// 1024x1536: la rotta ridimensiona prima di filigranare, ma solo sulle
// larghezze di questa lista, cosi' la CDN tiene poche varianti per immagine
// e nessuno puo' chiedere misure arbitrarie.

export const SAMPLE_WIDTHS = [480, 720, 1080] as const;
export type SampleWidth = (typeof SAMPLE_WIDTHS)[number];

/** La larghezza richiesta (?w=) se e' fra quelle ammesse, altrimenti null = originale. */
export function sampleWidth(param: string | null | undefined): SampleWidth | null {
  if (!param || !/^\d+$/.test(param)) return null;
  const n = Number(param);
  return (SAMPLE_WIDTHS as readonly number[]).includes(n) ? (n as SampleWidth) : null;
}

/** Aggiunge ?w= agli URL della galleria filigranata; gli altri restano come sono. */
export function sampleSrc(src: string, width: SampleWidth): string {
  return src.startsWith("/api/sample/") ? `${src}?w=${width}` : src;
}
