import Link from "next/link";
import type { ReactNode } from "react";
import { colors } from "@/lib/ui";

// Logo Semblic (scudo + wordmark). Link alla home.
// Lo scudo PNG ha fondo navy: lo fondiamo nel dark con una maschera radiale.
export function Logo({ size = 28 }: { size?: number }) {
  const mask = "radial-gradient(circle,#000 56%,transparent 80%)";
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-shield.png" alt="" aria-hidden style={{ width: size, height: size, objectFit: "contain", maskImage: mask, WebkitMaskImage: mask, flexShrink: 0 }} />
      <span style={{ color: colors.text, fontSize: "0.85rem", letterSpacing: "0.2em", fontWeight: 700 }}>SEMBLIC</span>
    </Link>
  );
}

// Barra di navigazione condivisa.
// - `breadcrumb`: etichetta dopo il logo (pagine interne, es. "Verifica token", "@mario-r").
// - `right`: contenuto a destra (link/CTA; la home passa la nav completa session-aware).
// Senza "use client": utilizzabile sia in server che in client component.
export function Nav({ breadcrumb, right }: { breadcrumb?: string; right?: ReactNode }) {
  return (
    <nav
      className="site-nav"
      style={{
        borderBottom: `1px solid ${colors.border}`,
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: right ? "space-between" : "flex-start",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Logo />
        {breadcrumb && (
          <>
            <span style={{ color: colors.faint }}>/</span>
            <span style={{ color: colors.muted, fontSize: "0.85rem" }}>{breadcrumb}</span>
          </>
        )}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>{right}</div>}
    </nav>
  );
}
