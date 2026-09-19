import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { OG, OG_SIZE, OgCornice, OgPillola, ogMarchio } from "@/lib/og-casa";

// OG card dedicata di /trasparenza, nella cornice della casa nuova. Le due
// pillole riprendono i due numeri manifesto della pagina (richieste rifiutate,
// volti protetti). STATICA di proposito: niente numeri live (pre-campagna
// sarebbero piccoli) e nessuna dipendenza dal DB nella generazione della card.

export const alt = "Rapporto di trasparenza · Semblic";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [fonts, marchio] = await Promise.all([ogFonts(), ogMarchio()]);
  return new ImageResponse(
    (
      <OgCornice occhiello="Rapporto di trasparenza" marchioUri={marchio}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.02 }}>
            <div style={{ display: "flex", color: OG.crema }}>La prova</div>
            <div style={{ display: "flex", color: OG.ambra }}>è nei numeri.</div>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: OG.tenue, lineHeight: 1.35, maxWidth: 940 }}>
            Richieste rifiutate, volti protetti, royalty pagate: i numeri reali del registro, letti in tempo reale.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgPillola colore={OG.corallo}>Richieste rifiutate</OgPillola>
            <OgPillola colore={OG.ambra}>Volti protetti</OgPillola>
          </div>
        </div>
      </OgCornice>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
