import type { CSSProperties } from "react";

// ──────────────────────────────────────────────────────────────────────────
// Design tokens SEMBLIC. Fonte unica di verità per colori, raggi e frammenti
// di stile ricorrenti (finora scritti a mano inline in ~15 file).
// Palette: Obsidian (base/superfici), Lumen (luce/testo), Amber (azione).
// Crimson e Teal restano colori SEMANTICI di stato (bloccato / verificato).
// NB: le chiavi `violet`/`violetLight` ora contengono AMBER (nome storico
// mantenuto per non riscrivere tutti i riferimenti). Vedi CLAUDE.md.
// ──────────────────────────────────────────────────────────────────────────

export const colors = {
  // Scala scura (sfondo → superfici) derivata da Obsidian #0C0F17
  bg: "#0C0F17",        // sfondo pagina (Obsidian)
  panel: "#11141D",     // pannelli/riquadri interni
  card: "#161A24",      // card
  raised: "#1F2532",    // elementi sollevati (placeholder portrait, input dark)

  // Testo (Lumen)
  text: "#F2E9D8",      // primario (Lumen)
  muted: "#8d8a82",     // secondario (grigio caldo)
  faint: "#5C5A54",     // terziario/etichette deboli

  // Brand / azione (Amber) + stati
  violet: "#F2A93B",       // = Amber (azione) — nome storico
  violetLight: "#F7C06A",  // = Amber chiaro
  amber: "#F2A93B",
  amberLight: "#F7C06A",
  crimson: "#B8005C",   // stato: bloccato/revocato
  teal: "#00A896",      // stato: verificato/consenso
  green: "#00c864",     // stato "ATTIVO"

  // Bordi (opacità crescente, tinta calda Lumen)
  border: "rgba(242,233,216,0.06)",
  border2: "rgba(242,233,216,0.08)",
  border3: "rgba(242,233,216,0.12)",
} as const;

// Gradiente azione (Amber). Usato da elementi decorativi del brand.
export const gradient = "linear-gradient(135deg,#F2A93B,#e0922a)";

// Raggi ricorrenti
export const radius = { sm: 8, md: 10, lg: 16, xl: 20, pill: 999 } as const;

// Tinte semitrasparenti del brand (per sfondi pill/badge) — usate spessissimo.
export const tint = {
  violet: "rgba(242,169,59,0.12)",
  violetBorder: "rgba(242,169,59,0.3)",
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

// Pulsante primario (Amber pieno, testo Obsidian — come da palette SEMBLIC).
export const buttonPrimary: CSSProperties = {
  border: "none",
  background: colors.amber,
  color: "#0C0F17",
  fontWeight: 800,
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
  background: "rgba(242,233,216,0.05)",
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
