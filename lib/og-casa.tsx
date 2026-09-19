import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { OG_FONT } from "@/lib/og-fonts";

// Cornice comune delle OG card, casa nuova (17/9/2026): la card e' un'ISOLA
// SCURA come l'hero della home (fondo #0C0F17 con alone ambra in alto a
// sinistra), marchio vero in testata, titolo in Instrument Sans 700 come i
// titoli del sito (WOFF in assets/fonts, lib/og-fonts) e hairline ambra in chiusura. Satori vuole display:flex su ogni div con piu' figli.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG = {
  crema: "#F2E9D8",
  tenue: "rgba(242,233,216,0.68)",
  ambra: "#F2A93B",
  verde: "#9CC6B2",
  corallo: "#F2958C",
};

let marchio: string | null | undefined;

// Il marchio letto dal disco come data URI (tracciato dal bundler come og-fonts).
export async function ogMarchio(): Promise<string | null> {
  if (marchio === undefined) {
    try {
      const buf = await readFile(fileURLToPath(new URL("../public/semblic-mark.png", import.meta.url)));
      marchio = `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      marchio = null;
    }
  }
  return marchio;
}

export function OgCornice({
  occhiello,
  destra,
  marchioUri,
  children,
}: {
  occhiello: string;
  destra?: string;
  marchioUri: string | null;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0C0F17",
        backgroundImage: "radial-gradient(70% 70% at 0% 0%, rgba(226,154,46,0.24), rgba(12,15,23,0) 65%)",
        color: OG.crema,
        padding: "60px 72px",
        fontFamily: OG_FONT,
      }}
    >
      {/* Testata: marchio, nome, occhiello */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {marchioUri && <img width={48} height={48} src={marchioUri} style={{ borderRadius: 12 }} />}
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: "0.2em", color: OG.crema }}>SEMBLIC</div>
          <div style={{ display: "flex", fontSize: 22, color: OG.tenue }}>· {occhiello}</div>
        </div>
        {destra && <div style={{ display: "flex", fontSize: 20, color: OG.tenue }}>{destra}</div>}
      </div>

      {children}

      {/* Chiusura: hairline ambra, la firma sotto i titoli del sito */}
      <div style={{ display: "flex", height: 3, width: 420, borderRadius: 999, backgroundImage: "linear-gradient(90deg, rgba(226,154,46,0.9), rgba(242,233,216,0.18) 55%, rgba(242,233,216,0))" }} />
    </div>
  );
}

// Pillola di stato: bordo e testo nello stesso colore, icona opzionale.
export function OgPillola({ colore, icona, children }: { colore: string; icona?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, border: `2px solid ${colore}`, borderRadius: 999, padding: "10px 24px", fontSize: 24, fontWeight: 600, color: colore }}>
      {icona && <img width={22} height={22} src={icona} />}
      {children}
    </div>
  );
}
