import type { CSSProperties } from "react";

// ──────────────────────────────────────────────────────────────────────────
// Design tokens SEMBLIC (sistema a 8 token + 3 gradienti, vedi
// SEMBLIC_COLORI_MIGRAZIONE.md). Tutto deriva da Obsidian/Lumen/Amber.
// Stati: salvia (verificato) e coral (bloccato). Il testo usa Lumen a opacita,
// MAI grigi. I nomi storici (violet/crimson/teal/green) restano come alias coi
// nuovi valori per non riscrivere ogni riferimento. Vedi CLAUDE.md.
// ──────────────────────────────────────────────────────────────────────────

export const colors = {
  // Identita + superfici (scala da Obsidian)
  bg: "#0C0F17",        // sfondo pagina (Obsidian)
  panel: "#141A24",     // pannelli/card (surface)
  card: "#141A24",      // card (surface)
  surface: "#141A24",
  raised: "#1E2530",    // input, modali (elevated)
  elevated: "#1E2530",
  edge: "#2C3440",      // linee, divisori

  // Testo: Lumen a tre intensita (niente grigi)
  text: "#F2E9D8",                      // primario (Lumen)
  muted: "rgba(242,233,216,0.70)",      // secondario
  faint: "rgba(242,233,216,0.45)",      // terziario

  // Azione
  amber: "#F2A93B",
  amberHover: "#E29A2E",

  // Stati funzionali
  verified: "#7FAE96",  // salvia: consenso OK, match trovato
  blocked: "#EE7A70",   // coral: nessun match, stop

  // Testo su fondi pieni colorati
  onAmber: "#412402",
  onVerified: "#16352A",
  onBlocked: "#5A201B",

  // Alias storici -> nuovi valori
  violet: "#F2A93B",        // = amber (azione)
  violetLight: "#E29A2E",   // = amber-hover
  amberLight: "#E29A2E",
  crimson: "#EE7A70",       // = blocked
  teal: "#7FAE96",          // = verified
  green: "#7FAE96",         // stato "ATTIVO" -> verified

  // Bordi (Lumen a opacita crescente, niente grigi)
  border: "rgba(242,233,216,0.06)",
  border2: "rgba(242,233,216,0.10)",
  border3: "rgba(242,233,216,0.12)",
} as const;

// Gradienti: SOLO sfondi e sezioni, MAI sui bottoni.
export const gradTramonto = "linear-gradient(135deg,#F2A93B 0%,#EE7A70 100%)";
export const gradAurora = "linear-gradient(135deg,#F2A93B 0%,#C25C3A 42%,#0C0F17 100%)";
export const gradFiducia = "linear-gradient(135deg,#7FAE96 0%,#2E8B7E 100%)";
// Alias storico: ora punta al gradiente sezione tramonto (mai usarlo sui bottoni).
export const gradient = gradTramonto;

// Raggi ricorrenti
export const radius = { sm: 8, md: 10, lg: 16, xl: 20, pill: 999 } as const;

// Tinte semitrasparenti (per sfondi pill/badge). Derivate dai token.
export const tint = {
  violet: "rgba(242,169,59,0.12)",
  violetBorder: "rgba(242,169,59,0.3)",
  crimson: "rgba(238,122,112,0.12)",
  crimsonBorder: "rgba(238,122,112,0.3)",
  teal: "rgba(127,174,150,0.12)",
  tealBorder: "rgba(127,174,150,0.3)",
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

// Pannello interno (stessa superficie della card, bordo piu tenue).
export const panel: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  padding: "1.5rem",
};

// Pulsante primario: Amber PIENO, testo on-amber. Mai gradienti sui bottoni.
export const buttonPrimary: CSSProperties = {
  border: "none",
  background: colors.amber,
  color: colors.onAmber,
  fontWeight: 800,
  fontSize: "0.9rem",
  borderRadius: radius.md,
  padding: "0.8rem 1.5rem",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};

// Pulsante secondario (ghost: trasparente, bordo hairline).
export const buttonSecondary: CSSProperties = {
  background: "transparent",
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

// Etichetta sezione (maiuscoletto spaziato, testo muted).
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
