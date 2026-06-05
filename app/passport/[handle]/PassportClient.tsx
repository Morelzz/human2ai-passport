"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, ConsentEvent, IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";

interface Props {
  avatar: Avatar;
  events: ConsentEvent[];
  status: "ATTIVO" | "REVOCATO";
  tier: { label: string; color: string; bg: string; description: string };
  tokenShort: string;
  ownerVerified?: boolean;
  galleryCount?: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PassportClient({ avatar, events, status, tier, tokenShort, ownerVerified, galleryCount = 0 }: Props) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard.writeText(avatar.token_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const royaltyEur = (avatar.royalty_accrued_cents / 100).toFixed(2);

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)", flexShrink: 0 }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.85rem", letterSpacing: "0.15em", fontWeight: 600 }}>HUMAN2AI</span>
        </Link>
        <span style={{ color: "#374151", marginLeft: "0.5rem" }}>/</span>
        <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>@{avatar.handle}</span>
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* Header card */}
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2rem", marginBottom: "1.5rem", display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Portrait */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: 120, height: 120, borderRadius: 16, overflow: "hidden", background: "#1c1c28", border: `2px solid ${tier.color}33` }}>
              {avatar.portrait_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar.portrait_url} alt={avatar.alias} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>👤</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Badge Verified */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(0,168,150,0.12)", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 999, padding: "0.25rem 0.75rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <span style={{ color: "#00A896", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em" }}>HUMAN2AI VERIFIED</span>
              </div>
              {ownerVerified && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 999, padding: "0.25rem 0.75rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B21E8" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                  <span style={{ color: "#6B21E8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em" }}>PERSONA REALE VERIFICATA</span>
                </div>
              )}
            </div>

            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem", lineHeight: 1.2 }}>{avatar.alias}</h1>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 0.75rem" }}>@{avatar.handle}</p>

            {/* Tier badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: tier.bg, border: `1px solid ${tier.color}44`, borderRadius: 999, padding: "0.3rem 0.9rem", marginBottom: "1rem" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: tier.color, display: "inline-block" }} />
              <span style={{ color: tier.color, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em" }}>{tier.label}</span>
              <span style={{ color: tier.color + "99", fontSize: "0.75rem" }}>— {tier.description}</span>
            </div>

            {/* Stato */}
            <div>
              {status === "ATTIVO" ? (
                <span style={{ display: "inline-block", background: "rgba(0,200,100,0.12)", border: "1px solid rgba(0,200,100,0.3)", color: "#00c864", borderRadius: 999, padding: "0.3rem 1rem", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em" }}>● ATTIVO</span>
              ) : (
                <span style={{ display: "inline-block", background: "rgba(184,0,92,0.12)", border: "1px solid rgba(184,0,92,0.4)", color: "#B8005C", borderRadius: 999, padding: "0.3rem 1rem", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em" }}>✕ REVOCATO</span>
              )}
            </div>
          </div>
        </div>

        {/* Repertorio — esempi generati da questo Soul (watermarkati) */}
        {galleryCount > 0 && (
          <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", margin: "0 0 1rem" }}>REPERTORIO — ESEMPI GENERATI</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {Array.from({ length: galleryCount }).map((_, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={`/api/sample/${avatar.handle}/${i}`} alt={`esempio ${i + 1}`}
                  style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "#1c1c28" }} />
              ))}
            </div>
            <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0.8rem 0 0", lineHeight: 1.5 }}>
              Immagini generate dal Soul reale di {avatar.alias}, watermarkate. Le generazioni commerciali sono pulite e certificate.
            </p>
          </div>
        )}

        {/* Identity kit — metadati strutturali immutabili */}
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", margin: 0 }}>IDENTITY KIT</p>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#6B21E8", background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 999, padding: "0.1rem 0.5rem", letterSpacing: "0.04em" }}>IMMUTABILE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
            {(Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).map((field) => (
              <div key={field}>
                <p style={{ color: "#6b7280", fontSize: "0.7rem", letterSpacing: "0.03em", margin: "0 0 0.2rem" }}>{IDENTITY_LABELS[field]}</p>
                <p style={{ color: "#f0f0f5", fontSize: "0.9rem", fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{avatar[field] ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Token */}
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.6rem" }}>TOKEN DI VERIFICA</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <code style={{ fontFamily: "monospace", fontSize: "1rem", color: "#6B21E8", background: "rgba(107,33,232,0.1)", padding: "0.4rem 0.8rem", borderRadius: 8, letterSpacing: "0.05em" }}>
              {tokenShort}
            </code>
            <button onClick={copyToken} style={{ background: copied ? "rgba(0,168,150,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "#00A896" : "rgba(255,255,255,0.1)"}`, color: copied ? "#00A896" : "#9ca3af", borderRadius: 8, padding: "0.35rem 0.8rem", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>
              {copied ? "✓ Copiato" : "Copia token"}
            </button>
            <Link href="/verify" style={{ background: "rgba(107,33,232,0.1)", border: "1px solid rgba(107,33,232,0.3)", color: "#8b47f0", borderRadius: 8, padding: "0.35rem 0.8rem", fontSize: "0.8rem", textDecoration: "none" }}>
              Verifica →
            </Link>
          </div>
        </div>

        {/* Timeline di consenso */}
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "1rem" }}>TIMELINE DI CONSENSO</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {events.map((ev) => {
              const isRevoked = ev.event_type === "REVOKED";
              const color = isRevoked ? "#B8005C" : "#00A896";
              const labels: Record<string, string> = {
                GRANTED: "Consenso concesso",
                CATEGORY_ADDED: "Categoria aggiunta",
                CATEGORY_REMOVED: "Categoria rimossa",
                REVOKED: "Revoca del consenso",
              };
              return (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ color: color, fontWeight: 600, fontSize: "0.85rem" }}>{labels[ev.event_type]}</span>
                  {ev.detail && <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>— {ev.detail}</span>}
                  <span style={{ color: "#374151", fontSize: "0.8rem", marginLeft: "auto" }}>{formatDate(ev.occurred_at)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>Autorizzato dal</span>
              <p style={{ color: "#f0f0f5", fontWeight: 600, fontSize: "0.9rem", margin: "0.2rem 0 0" }}>{formatDate(avatar.consent_start)}</p>
            </div>
            {avatar.revoked_at && (
              <div>
                <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>Revocato dal</span>
                <p style={{ color: "#B8005C", fontWeight: 600, fontSize: "0.9rem", margin: "0.2rem 0 0" }}>{formatDate(avatar.revoked_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Categorie */}
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "1rem" }}>CATEGORIE DI UTILIZZO</p>
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginBottom: "0.5rem" }}>Consentite</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {avatar.approved_categories.map((cat) => (
                <span key={cat} style={{ background: "rgba(0,168,150,0.12)", border: "1px solid rgba(0,168,150,0.3)", color: "#00A896", borderRadius: 999, padding: "0.25rem 0.75rem", fontSize: "0.8rem", fontWeight: 600 }}>
                  ✓ {cat}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginBottom: "0.5rem" }}>Escluse</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {avatar.excluded_categories.map((cat) => (
                <span key={cat} style={{ background: "rgba(184,0,92,0.10)", border: "1px solid rgba(184,0,92,0.25)", color: "#B8005C", borderRadius: 999, padding: "0.25rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, textDecoration: "line-through" }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Statistiche */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>UTILIZZI TOTALI</p>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "#f0f0f5", margin: 0 }}>{avatar.usage_count.toLocaleString("it-IT")}</p>
          </div>
          <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>ROYALTY MATURATE</p>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "#6B21E8", margin: 0 }}>€{royaltyEur}</p>
          </div>
        </div>

        {/* Nota legale */}
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.25rem" }}>
          <p style={{ color: "#4b5563", fontSize: "0.78rem", lineHeight: 1.6, margin: 0 }}>
            Questo soggetto è una persona reale che ha dato consenso esplicito all&apos;utilizzo della propria immagine nelle categorie indicate. Ogni utilizzo genera una royalty a suo favore. La revoca del consenso è prospettica: blocca gli utilizzi futuri, non cancella quelli passati. Nessun dato biometrico è memorizzato o trasmesso.
          </p>
        </div>

      </main>
    </div>
  );
}
