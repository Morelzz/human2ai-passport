import type { CSSProperties } from "react";

// ──────────────────────────────────────────────────────────────────────────
// Design tokens Human2AI ("Obsidian Intelligence").
// Fonte unica di verità per colori, raggi e frammenti di stile ricorrenti.
// Finora questi valori erano scritti a mano inline in ~15 file: centralizzarli
// elimina la duplicazione e tiene il brand coerente. Vedi CLAUDE.md per la palette.
// ──────────────────────────────────────────────────────────────────────────

export const colors = {
  // Scala scura (sfondo → superfici)
  bg: "#0a0a0f",        // sfondo pagina
  panel: "#0d0d14",     // pannelli/riquadri interni
  card: "#12121a",      // card
  raised: "#1c1c28",    // elementi sollevati (placeholder portrait, input dark)

  // Testo
  text: "#f0f0f5",      // primario
  muted: "#6b7280",     // secondario
  faint: "#374151",     // terziario/etichette deboli

  // Brand
  violet: "#6B21E8",
  violetLight: "#8b47f0",
  crimson: "#B8005C",
  teal: "#00A896",
  green: "#00c864",     // stato "ATTIVO"

  // Bordi (opacità crescente)
  border: "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.08)",
  border3: "rgba(255,255,255,0.12)",
} as const;

export const gradient = "linear-gradient(135deg,#6B21E8,#B8005C)";

// Raggi ricorrenti
export const radius = { sm: 8, md: 10, lg: 16, xl: 20, pill: 999 } as const;

// Tinte semitrasparenti del brand (per sfondi pill/badge) — usate spessissimo.
export const tint = {
  violet: "rgba(107,33,232,0.12)",
  violetBorder: "rgba(107,33,232,0.3)",
  crimson: "rgba(184,0,92,0.12)",
  crimsonBorder: "rgba(184,0,92,0.3)",
  teal: "rgba(0,168,150,0.12)",
  tealBorder: "rgba(0,168,150,0.3)",
} as const;

// ── Frammenti di stile riusabili ──────────────────────────────────────────

// Sfondo pagina a tutta altezza (il wrapper di quasi ogni pagina).
export const page: CSSProperties = {
  background: colors.bg,
  minHeight: "100vh",
  color: colors.text,
};

// Card standard.
export const card: CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border2}`,
  borderRadius: radius.lg,
  padding: "1.5rem",
};

// Pannello interno (più scuro della card).
export const panel: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  padding: "1.5rem",
};

// Pulsante primario (gradiente brand).
export const buttonPrimary: CSSProperties = {
  border: "none",
  background: gradient,
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.9rem",
  borderRadius: radius.md,
  padding: "0.8rem 1.5rem",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};

// Pulsante secondario (outline tenue).
export const buttonSecondary: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${colors.border3}`,
  color: colors.text,
  fontWeight: 700,
  fontSize: "0.9rem",
  borderRadius: radius.md,
  padding: "0.8rem 1.5rem",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};

// Etichetta sezione (maiuscoletto spaziato grigio).
export const sectionLabel: CSSProperties = {
  color: colors.muted,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  margin: 0,
};

// Pill/badge generica: passa colore testo + bordo + sfondo.
export function pill(fg: string, bg: string, border: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    background: bg,
    border: `1px solid ${border}`,
    color: fg,
    borderRadius: radius.pill,
    padding: "0.25rem 0.75rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
  };
}
