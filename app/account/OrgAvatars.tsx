"use client";

import { useState } from "react";
import Link from "next/link";
import { colors, gradient, tint, radius } from "@/lib/ui";

// Dashboard multi-avatar per le organizzazioni (Enterprise).
// Un account agenzia gestisce molti avatar; ognuno ha il suo ciclo:
// pending_review → (consenso persona) → revisione operatori → approved (live) | rejected.
export interface OrgAvatar {
  handle: string;
  alias: string;
  verification_status: string;
  person_consented_at: string | null;
  consent_token: string | null;
  soul_ref: string | null;
  royalty_accrued_cents: number;
  usage_count: number;
}

function StatusBadge({ status, consented }: { status: string; consented: boolean }) {
  // Stato leggibile: distingue "in attesa del consenso" da "in revisione".
  let label: string, fg: string, bg: string, border: string;
  if (status === "approved") {
    label = "● Live nel registro"; fg = colors.teal; bg = tint.teal; border = tint.tealBorder;
  } else if (status === "rejected") {
    label = "✕ Sospeso / rifiutato"; fg = colors.crimson; bg = tint.crimson; border = tint.crimsonBorder;
  } else if (!consented) {
    label = "○ In attesa del consenso"; fg = colors.violetLight; bg = tint.violet; border = tint.violetBorder;
  } else {
    label = "◐ In revisione operatori"; fg = colors.violetLight; bg = tint.violet; border = tint.violetBorder;
  }
  return (
    <span style={{ background: bg, border: `1px solid ${border}`, color: fg, borderRadius: radius.pill, padding: "0.2rem 0.7rem", fontSize: "0.72rem", fontWeight: 700 }}>
      {label}
    </span>
  );
}

function ConsentLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/consent/${token}` : `/consent/${token}`;
  return (
    <div style={{ marginTop: "0.7rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      <code style={{ flex: 1, minWidth: 180, background: colors.bg, border: `1px solid ${colors.border3}`, borderRadius: radius.sm, padding: "0.5rem 0.7rem", color: colors.violetLight, fontSize: "0.74rem", wordBreak: "break-all" }}>{url}</code>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ padding: "0.5rem 0.9rem", borderRadius: radius.sm, border: `1px solid ${tint.violetBorder}`, background: tint.violet, color: copied ? colors.teal : colors.violetLight, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
      >
        {copied ? "✓ Copiato" : "Copia link"}
      </button>
    </div>
  );
}

export default function OrgAvatars({ avatars }: { avatars: OrgAvatar[] }) {
  const live = avatars.filter((a) => a.verification_status === "approved").length;

  return (
    <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "1.5rem", marginTop: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <p style={{ color: colors.muted, fontSize: "0.8rem", letterSpacing: "0.06em", margin: 0 }}>
          I TUOI AVATAR · {avatars.length} totali, {live} live
        </p>
        <Link href="/account/avatar" style={{ background: gradient, color: "#fff", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none", borderRadius: radius.md, padding: "0.5rem 1rem" }}>
          + Onboarda avatar
        </Link>
      </div>

      {avatars.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
          Nessun avatar ancora. Onboarda la prima persona: creerai l&apos;avatar e otterrai un link di consenso da farle confermare.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {avatars.map((a) => {
            const consented = !!a.person_consented_at;
            const pendingConsent = a.verification_status === "pending_review" && !consented && !!a.consent_token;
            return (
              <div key={a.handle} style={{ background: colors.card, border: `1px solid ${colors.border2}`, borderRadius: radius.md, padding: "1rem 1.1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: colors.text, fontWeight: 700, fontSize: "0.95rem" }}>{a.alias}</div>
                    <div style={{ color: colors.muted, fontSize: "0.78rem" }}>@{a.handle}</div>
                  </div>
                  <StatusBadge status={a.verification_status} consented={consented} />
                </div>

                <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                  {a.soul_ref && <span style={{ color: colors.teal, fontSize: "0.74rem", fontWeight: 700 }}>● Soul attivo</span>}
                  <span style={{ color: colors.faint, fontSize: "0.74rem" }}>{a.usage_count.toLocaleString("it-IT")} utilizzi</span>
                  <span style={{ color: colors.faint, fontSize: "0.74rem" }}>€{(a.royalty_accrued_cents / 100).toFixed(2)} royalty</span>
                </div>

                {pendingConsent && <ConsentLink token={a.consent_token!} />}

                {a.verification_status === "approved" && (
                  <Link href={`/passport/${a.handle}`} style={{ display: "inline-block", marginTop: "0.7rem", color: colors.violetLight, fontSize: "0.8rem", textDecoration: "none" }}>
                    Vai al passport pubblico →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
