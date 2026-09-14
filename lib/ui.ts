import type { CSSProperties } from "react";

// ──────────────────────────────────────────────────────────────────────────
// Design tokens SEMBLIC per gli stili inline (le pagine piu' vecchie e i
// pannelli che usano `style={{...}}`). Casa nuova (2026-09-14): ogni valore e'
// una VARIABILE CSS di tema (vedi app/globals.css), cosi' lo stesso stile
// segue il corpo chiaro e le isole scure senza riscrivere i riferimenti.
// I nomi storici (violet/crimson/teal/green) restano come alias.
// ──────────────────────────────────────────────────────────────────────────

export const colors = {
  // Superfici
  bg: "var(--bg)",
  panel: "var(--surface)",
  card: "var(--surface)",
  surface: "var(--surface)",
  raised: "var(--elevated)",
  elevated: "var(--elevated)",
  edge: "var(--edge)",

  // Testo a tre intensita'
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",

  // Azione
  amber: "var(--amber-c)",
  amberHover: "var(--amber-hover-c)",

  // Stati funzionali
  verified: "var(--verified-c)",
  blocked: "var(--blocked-c)",

  // Testo su fondi pieni colorati
  onAmber: "var(--on-amber-c)",
  onVerified: "var(--on-verified-c)",
  onBlocked: "var(--on-blocked-c)",

  // Alias storici
  violet: "var(--amber-ink)",
  violetLight: "var(--amber-ink)",
  amberLight: "var(--amber-hover-c)",
  crimson: "var(--blocked-c)",
  teal: "var(--verified-c)",
  green: "var(--verified-c)",

  // Bordi
  border: "var(--hairline-soft)",
  border2: "var(--hairline)",
  border3: "var(--edge)",
} as const;

// Gradienti: SOLO sfondi e sezioni, MAI sui bottoni.
export const gradTramonto = "var(--grad-tramonto)";
export const gradAurora = "var(--grad-aurora)";
export const gradFiducia = "var(--grad-fiducia)";
// Alias storico: ora punta al gradiente sezione tramonto (mai usarlo sui bottoni).
export const gradient = gradTramonto;

// Raggi ricorrenti (casa nuova: angoli piu' morbidi)
export const radius = { sm: 10, md: 12, lg: 18, xl: 22, pill: 999 } as const;

// Tinte per sfondi di pill/badge: i token "soft" del tema.
export const tint = {
  violet: "var(--amber-soft)",
  violetBorder: "color-mix(in srgb, var(--amber-c) 45%, transparent)",
  crimson: "var(--blocked-soft)",
  crimsonBorder: "color-mix(in srgb, var(--blocked-c) 45%, transparent)",
  teal: "var(--verified-soft)",
  tealBorder: "color-mix(in srgb, var(--verified-c) 45%, transparent)",
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

// Pannello interno (stessa superficie della card, bordo piu' tenue).
export const panel: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  padding: "1.5rem",
};

// Pulsante primario: Amber PIENO, testo on-amber, pillola. Mai gradienti sui bottoni.
export const buttonPrimary: CSSProperties = {
  border: "none",
  background: colors.amber,
  color: colors.onAmber,
  fontWeight: 600,
  fontSize: "0.92rem",
  borderRadius: radius.pill,
  padding: "0.8rem 1.5rem",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};

// Pulsante secondario (trasparente, bordo).
export const buttonSecondary: CSSProperties = {
  background: "transparent",
  border: `1px solid ${colors.border3}`,
  color: colors.text,
  fontWeight: 600,
  fontSize: "0.92rem",
  borderRadius: radius.pill,
  padding: "0.8rem 1.5rem",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};

// Etichetta sezione (maiuscoletto spaziato, mono, ambra scuro).
export const sectionLabel: CSSProperties = {
  color: "var(--amber-ink)",
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: "0.6875rem",
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
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
    fontWeight: 600,
    letterSpacing: "0.04em",
  };
}
