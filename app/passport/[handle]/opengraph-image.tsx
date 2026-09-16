import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import { TIER_CONFIG, Tier } from "@/lib/types";
import { truncateToken } from "@/lib/token";
import { geistOgFonts } from "@/lib/og-fonts";
import { checkIcon, crossIcon } from "@/lib/og-icons";
import { OG, OG_SIZE, OgCornice, OgPillola, ogMarchio } from "@/lib/og-casa";

// Review C5: OG card dinamica del passport, ogni volto ha la sua social card
// (nome, tier, stato verificato/revocato, token) generata da Next al volo. La
// convenzione opengraph-image la aggancia da sola ai metadata.
// Card tipografica (niente ritratto: la prova e' il registro, non la foto),
// nella cornice della casa nuova (isola scura, marchio, hairline ambra).

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Passaporto del volto · Semblic";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const sb = createServerClient();
  const { data: avatar } = await sb.from("avatars").select("*").eq("handle", handle).single();
  if (!avatar || !isPublicAvatar(avatar)) notFound();

  const revoked = Boolean(avatar.revoked_at);
  const tier = TIER_CONFIG[avatar.tier as Tier] ?? { label: avatar.tier };
  const stato = revoked ? OG.corallo : OG.verde;
  const [fonts, marchio] = await Promise.all([geistOgFonts(), ogMarchio()]);

  return new ImageResponse(
    (
      <OgCornice occhiello="Passaporto del volto" destra={truncateToken(avatar.token_hash)} marchioUri={marchio}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 128, letterSpacing: "-0.05em", lineHeight: 0.95, color: revoked ? OG.tenue : OG.crema }}>
            {avatar.alias}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgPillola colore={stato} icona={revoked ? crossIcon(stato) : checkIcon(stato)}>
              {revoked ? "Consenso revocato" : "Persona verificata"}
            </OgPillola>
            <OgPillola colore={OG.ambra}>{tier.label}</OgPillola>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: OG.tenue, lineHeight: 1.35, maxWidth: 1056 }}>
            {revoked
              ? "Questa persona ha cambiato idea: il suo volto non è più generabile."
              : "Persona reale, consenziente e pagata. Ogni utilizzo è verificabile dal token."}
          </div>
        </div>
      </OgCornice>
    ),
    fonts.length ? { ...size, fonts } : size
  );
}
