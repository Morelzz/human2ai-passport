import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { getPost } from "@/lib/blog";
import { OG, OG_SIZE, OgCornice, ogMarchio } from "@/lib/og-casa";

// OG card per-articolo: il TITOLO dell'articolo nella cornice della casa nuova.
// Garantisce un'immagine social a OGNI articolo, anche senza cover. Gli articoli
// col cover usano comunque openGraph.images (il cover), che ha precedenza.
export const alt = "Semblic · Blog";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, fonts, marchio] = await Promise.all([getPost(slug), ogFonts(), ogMarchio()]);
  const title = post?.title ?? "Semblic";
  const lungo = title.length > 70;

  return new ImageResponse(
    (
      <OgCornice occhiello={`Il blog · ${post?.category ?? "Voci"}`} marchioUri={marchio}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: lungo ? 58 : 68, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.08, color: OG.crema, maxWidth: 1056 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: OG.ambra }}>Il registro dei volti consenzienti</div>
        </div>
      </OgCornice>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
