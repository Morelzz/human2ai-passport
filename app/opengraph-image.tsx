import { ImageResponse } from "next/og";
import { geistOgFonts } from "@/lib/og-fonts";
import { checkIcon } from "@/lib/og-icons";

// OG card di DEFAULT del sito (1200x630 landscape, per le card social
// "summary_large_image"). Sostituisce il logo-shield quadrato 1024x1024 che si
// tagliava male nelle anteprime. Stesso stile della card passport (gia'
// approvato): void assoluto, wordmark, barra tricolore. Pura tipografia.
// Il titolo display usa Geist peso 200 (brand "Dala"); il resto resta Geist 400.
// Le route con immagine PROPRIA restano invariate: il passport ha il suo
// opengraph-image per-volto; gli articoli col cover usano openGraph.images.
// Tutte le altre (home, verify, proteggi, catalogo, prezzi, trasparenza...)
// usano questa, ereditandola dalla root.

export const alt = "Human2AI · Il registro dei volti consenzienti";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fonts = await geistOgFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          color: "#f0f0f5",
          padding: "64px 72px",
          fontFamily: "Geist",
        }}
      >
        {/* Testata */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: "0.18em", color: "#f0f0f5" }}>HUMAN2AI</div>
          <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.14em", color: "#9a9a9a" }}>· REGISTRO DEI VOLTI</div>
        </div>

        {/* Messaggio */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontWeight: 200, fontSize: 80, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#ffffff", maxWidth: 1000 }}>
            Il registro dei volti consenzienti.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#9a9a9a", lineHeight: 1.4, maxWidth: 900 }}>
            Ogni volto ha un consenso verificabile. Ogni generazione paga la persona reale.
          </div>
        </div>

        {/* Chiusura */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "2px solid #00d4be", borderRadius: 999, padding: "8px 22px", fontSize: 22, color: "#00d4be", letterSpacing: "0.06em" }}>
              <img width={20} height={20} src={checkIcon("#00d4be")} />
              CONSENSO VERIFICABILE
            </div>
            <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "8px 22px", fontSize: 22, color: "#c9c9d4", letterSpacing: "0.06em" }}>
              FILIGRANA INVISIBILE
            </div>
          </div>
          <div style={{ display: "flex", height: 4, width: 380, borderRadius: 999, background: "linear-gradient(90deg, #8b47f0, #e0006f, #00d4be)" }} />
        </div>
      </div>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
