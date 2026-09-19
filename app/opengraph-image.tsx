import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { checkIcon } from "@/lib/og-icons";
import { OG, OG_SIZE, OgCornice, OgPillola, ogMarchio } from "@/lib/og-casa";

// OG card di DEFAULT del sito (1200x630, card social "summary_large_image").
// Casa nuova: isola scura come l'hero, titolo pieno con l'accento ambra.
// Le route con immagine PROPRIA restano a parte: il passport ha la sua card
// per volto, gli articoli col cover usano openGraph.images. Tutte le altre
// pagine (home, verify, catalogo, prezzi...) ereditano questa dalla root.

export const alt = "Semblic · Il registro dei volti consenzienti";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [fonts, marchio] = await Promise.all([ogFonts(), ogMarchio()]);
  return new ImageResponse(
    (
      <OgCornice occhiello="Registro dei volti" marchioUri={marchio}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.02 }}>
            <div style={{ display: "flex", color: OG.crema }}>Real Humans. Real Rights.</div>
            <div style={{ display: "flex", color: OG.ambra }}>Real Earnings.</div>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: OG.tenue, lineHeight: 1.35, maxWidth: 940 }}>
            Nessuna AI genera un essere umano senza il permesso di una persona reale: riconosciuta, protetta e pagata.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgPillola colore={OG.verde} icona={checkIcon(OG.verde)}>Consenso verificabile</OgPillola>
            <OgPillola colore={OG.tenue}>Filigrana invisibile</OgPillola>
          </div>
        </div>
      </OgCornice>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
