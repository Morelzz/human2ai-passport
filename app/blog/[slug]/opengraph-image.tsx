import { ImageResponse } from "next/og";
import { geistOgFonts } from "@/lib/og-fonts";
import { getPost } from "@/lib/blog";

// OG card per-articolo: card brandizzata col TITOLO dell'articolo. Garantisce
// un'immagine social a OGNI articolo, anche senza cover. Gli articoli col cover
// usano comunque openGraph.images (il cover), che ha precedenza su questa.
export const alt = "Semblic · Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const fonts = await geistOgFonts();
  const title = post?.title ?? "Semblic";
  const category = (post?.category ?? "Blog").toUpperCase();

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
          <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.14em", color: "rgba(242,233,216,0.70)" }}>· {category}</div>
        </div>

        {/* Titolo dell'articolo (display sottile del brand) */}
        <div style={{ display: "flex", fontWeight: 200, fontSize: 60, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#F2E9D8", maxWidth: 1056 }}>
          {title}
        </div>

        {/* Chiusura */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(242,233,216,0.70)" }}>Il registro dei volti consenzienti</div>
          <div style={{ display: "flex", height: 4, width: 380, borderRadius: 999, background: "linear-gradient(90deg, #F2A93B, #EE7A70, #7FAE96)" }} />
        </div>
      </div>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
