"use client";

import Link from "next/link";
import { TIER_CONFIG, Tier } from "@/lib/types";

interface Props {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  usage_count: number;
  revoked_at: string | null;
}

export default function AvatarCard({ handle, alias, portrait_url, tier: tierKey, usage_count, revoked_at }: Props) {
  const tier = TIER_CONFIG[tierKey];
  const isRevoked = !!revoked_at;

  return (
    <Link href={`/passport/${handle}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#12121a",
          border: `1px solid ${isRevoked ? "rgba(184,0,92,0.2)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 16,
          padding: "1.25rem",
          cursor: "pointer",
          transition: "border-color 0.2s, transform 0.2s",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = tier.color + "55";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = isRevoked ? "rgba(184,0,92,0.2)" : "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Portrait */}
        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: "#1c1c28", border: `1px solid ${tier.color}33`, flexShrink: 0 }}>
          {portrait_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait_url} alt={alias} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>👤</div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "1rem" }}>{alias}</span>
            {isRevoked && (
              <span style={{ color: "#B8005C", fontSize: "0.65rem", fontWeight: 700, background: "rgba(184,0,92,0.12)", border: "1px solid rgba(184,0,92,0.3)", borderRadius: 999, padding: "0.1rem 0.4rem" }}>
                REVOCATO
              </span>
            )}
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>@{handle}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}33`, borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.7rem", fontWeight: 700 }}>
              {tier.label}
            </span>
            <span style={{ color: "#374151", fontSize: "0.75rem" }}>{usage_count?.toLocaleString("it-IT")} utilizzi</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
