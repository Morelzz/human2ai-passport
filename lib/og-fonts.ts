import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Font delle OG card (next/og / Satori): Instrument Sans, lo stesso del sito
// (19/9/2026). Satori NON accetta WOFF2, quindi i WOFF in assets/fonts/ (dal
// pacchetto @fontsource/instrument-sans 5.3.0, sottoinsieme latin con le
// accentate italiane, licenza OFL in assets/fonts/InstrumentSans-OFL.txt).
// Pesi 400 (testo), 600 (pillole) e 700 (titoli, come font-bold del sito).
// Carico via fs.readFile (runtime Node): fetch(file://) NON funziona su Node, ma
// new URL(..., import.meta.url) fa emettere/tracciare l'asset dal bundler (vale
// anche su Vercel). Difensivo + cache di modulo: se fallisce torna [] e la card
// passa l'opzione "size" SENZA la chiave fonts (next/og usa il suo font di
// default: mai un array vuoto, che darebbe "No fonts are loaded").

type OgFont = { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" };

export const OG_FONT = "Instrument Sans";

let cache: OgFont[] | undefined;

export async function ogFonts(): Promise<OgFont[]> {
  if (cache === undefined) {
    try {
      const [w400, w600, w700] = await Promise.all([
        readFile(fileURLToPath(new URL("../assets/fonts/InstrumentSans-400.woff", import.meta.url))),
        readFile(fileURLToPath(new URL("../assets/fonts/InstrumentSans-600.woff", import.meta.url))),
        readFile(fileURLToPath(new URL("../assets/fonts/InstrumentSans-700.woff", import.meta.url))),
      ]);
      cache = [
        { name: OG_FONT, data: w400, weight: 400, style: "normal" },
        { name: OG_FONT, data: w600, weight: 600, style: "normal" },
        { name: OG_FONT, data: w700, weight: 700, style: "normal" },
      ];
    } catch {
      cache = [];
    }
  }
  return cache;
}
