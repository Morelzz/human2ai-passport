import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Font Geist per le OG card (next/og / Satori). Satori NON accetta WOFF2, quindi
// uso due TTF (assets/fonts/Geist-{400,200}.ttf, da Google Fonts): il 400 per il
// testo UI (wordmark, occhiello, sottotitolo, pill) e il 200 (UltraLight) per i
// TITOLI display, coerente col brand "Dala" (peso 200, tracking -0.04em).
// Carico via fs.readFile (runtime Node): fetch(file://) NON funziona su Node, ma
// new URL(..., import.meta.url) fa emettere/tracciare l'asset dal bundler (vale
// anche su Vercel). Difensivo + cache di modulo: se fallisce torna [] e la card
// passa l'opzione "size" SENZA la chiave fonts (next/og usa il suo Geist di
// default: mai un array vuoto, che darebbe "No fonts are loaded").

type OgFont = { name: string; data: Buffer; weight: 200 | 400; style: "normal" };

let cache: OgFont[] | undefined;

export async function geistOgFonts(): Promise<OgFont[]> {
  if (cache === undefined) {
    try {
      const [w400, w200] = await Promise.all([
        readFile(fileURLToPath(new URL("../assets/fonts/Geist-400.ttf", import.meta.url))),
        readFile(fileURLToPath(new URL("../assets/fonts/Geist-200.ttf", import.meta.url))),
      ]);
      cache = [
        { name: "Geist", data: w400, weight: 400, style: "normal" },
        { name: "Geist", data: w200, weight: 200, style: "normal" },
      ];
    } catch {
      cache = [];
    }
  }
  return cache;
}
