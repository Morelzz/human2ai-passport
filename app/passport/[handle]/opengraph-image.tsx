import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import { TIER_CONFIG, Tier } from "@/lib/types";
import { truncateToken } from "@/lib/token";

// Review C5 — OG card dinamica del passport: ogni volto ha la sua social
// card (nome, tier, stato verificato/revocato, token) generata da Next al
// volo. La convenzione opengraph-image la aggancia da sola ai metadata.
// Card tipografica pura sul void (niente ritratto: la prova è il registro,
// non la foto) — coerente Dala: nero, hairline, un colore di stato.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Passaporto del volto · Human2AI";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const sb = createServerClient();
  const { data: avatar } = await sb.from("avatars").select("*").eq("handle", handle).single();
  if (!avatar || !isPublicAvatar(avatar)) notFound();

  const revoked = Boolean(avatar.revoked_at);
  const tier = TIER_CONFIG[avatar.tier as Tier] ?? { label: avatar.tier, color: "#8b47f0" };
  const statusColor = revoked ? "#e0006f" : "#00d4be";

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
          fontFamily: "sans-serif",
        }}
      >
        {/* Testata */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 30, letterSpacing: "0.18em", color: "#f0f0f5" }}>HUMAN2AI</div>
            <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.14em", color: "#9a9a9a" }}>· REGISTRO DEI VOLTI</div>
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#9a9a9a" }}>{truncateToken(avatar.token_hash)}</div>
        </div>

        {/* Nome + stato */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 108, letterSpacing: "-0.04em", lineHeight: 1, color: "#ffffff" }}>
            {avatar.alias}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: `2px solid ${statusColor}`,
                borderRadius: 999,
                padding: "10px 26px",
                fontSize: 26,
                color: statusColor,
                letterSpacing: "0.06em",
              }}
            >
              {revoked ? "✕ CONSENSO REVOCATO" : "✓ UMANO VERIFICATO"}
            </div>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 999,
                padding: "10px 26px",
                fontSize: 26,
                color: tier.color,
                letterSpacing: "0.08em",
              }}
            >
              {tier.label}
            </div>
          </div>
        </div>

        {/* Chiusura */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#9a9a9a", lineHeight: 1.4 }}>
            {revoked
              ? "Questa persona ha cambiato idea: il suo volto non è più generabile."
              : "Persona reale, consenziente e pagata. Ogni utilizzo è verificabile dal token."}
          </div>
          <div style={{ display: "flex", height: 4, width: 380, borderRadius: 999, background: "linear-gradient(90deg, #8b47f0, #e0006f, #00d4be)" }} />
        </div>
      </div>
    ),
    size
  );
}
