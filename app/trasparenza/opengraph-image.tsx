import { ImageResponse } from "next/og";
import { geistOgFonts } from "@/lib/og-fonts";

// OG card dedicata di /trasparenza (transparency report): stessa estetica della
// card di default. Le due pill riprendono i due numeri manifesto della pagina
// (richieste rifiutate = crimson, volti protetti = amber). STATICA di proposito:
// niente numeri live (pre-campagna sarebbero piccoli, es. 0 protetti) e nessuna
// dipendenza dal DB nella generazione della card. La pagina non sovrascrive
// openGraph nei metadata -> questa card file-based si aggancia da sola. Copy
// senza accenti (font di sistema next/og: solo · e ✓). Titolo in Geist peso 200.

export const alt = "Transparency report · Semblic";
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
          background: "#0C0F17",
          color: "#F2E9D8",
          padding: "64px 72px",
          fontFamily: "Geist",
        }}
      >
        {/* Testata */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: "0.18em", color: "#F2E9D8" }}>SEMBLIC</div>
          <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.14em", color: "#9a9a9a" }}>· TRANSPARENCY REPORT</div>
        </div>

        {/* Messaggio */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontWeight: 200, fontSize: 80, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#ffffff", maxWidth: 1000 }}>
            Numeri, non promesse.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#9a9a9a", lineHeight: 1.4, maxWidth: 900 }}>
            Richieste rifiutate, volti protetti, royalty pagate: i numeri reali del registro, letti in tempo reale.
          </div>
        </div>

        {/* Chiusura: le due pill = i due numeri manifesto della pagina */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", border: "2px solid #e0006f", borderRadius: 999, padding: "8px 22px", fontSize: 22, color: "#e0006f", letterSpacing: "0.06em" }}>
              RICHIESTE RIFIUTATE
            </div>
            <div style={{ display: "flex", border: "2px solid #F2A93B", borderRadius: 999, padding: "8px 22px", fontSize: 22, color: "#F2A93B", letterSpacing: "0.06em" }}>
              VOLTI PROTETTI
            </div>
          </div>
          <div style={{ display: "flex", height: 4, width: 380, borderRadius: 999, background: "linear-gradient(90deg, #F2A93B, #e0006f, #00d4be)" }} />
        </div>
      </div>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
