// ──────────────────────────────────────────────────────────────────────────
// Regia vocale: logica PURA. Trasforma l'output grezzo dell'LLM (che mappa una
// descrizione parlata o scritta sui controlli dello Studio) in una direzione
// SICURA: solo i token validi dei cataloghi di studio-options passano, mai
// testo libero come parametro fotografico. Stessa filosofia della whitelist di
// /api/edit/interpret. La chiamata all'LLM vive nella route, qui niente rete.
// NB testi italiani senza trattini lunghi (regola di Morelz).
// ──────────────────────────────────────────────────────────────────────────

import {
  POSES, FRAMINGS, EXPRESSIONS, COLOR_STYLES, CAMERAS, LENSES, LIGHTS, validEnum,
} from "@/lib/studio-options";
import type { Opt } from "@/lib/studio-options";

export interface StudioDirection {
  scene: string | null; // scena ripulita (sola descrizione), null se non fornita
  pose: string | null;
  framing: string | null;
  expression: string | null;
  colorStyle: string | null;
  camera: string | null;
  lens: string | null;
  light: string | null;
}

// Filtra l'output grezzo tenendo SOLO i token validi dei cataloghi e una scena
// ripulita e capata a 500. Qualsiasi valore ignoto diventa null.
export function interpretToStudio(parsed: unknown): StudioDirection {
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const sceneRaw = typeof p.scene === "string" ? p.scene.trim() : "";
  return {
    scene: sceneRaw ? sceneRaw.slice(0, 500) : null,
    pose: validEnum(POSES, p.pose),
    framing: validEnum(FRAMINGS, p.framing),
    expression: validEnum(EXPRESSIONS, p.expression),
    colorStyle: validEnum(COLOR_STYLES, p.colorStyle),
    camera: validEnum(CAMERAS, p.camera),
    lens: validEnum(LENSES, p.lens),
    light: validEnum(LIGHTS, p.light),
  };
}

// Vero se la regia ha impostato almeno un controllo (la scena da sola non conta).
export function hasAnyControl(d: StudioDirection): boolean {
  return !!(d.pose || d.framing || d.expression || d.colorStyle || d.camera || d.lens || d.light);
}

// Etichette umane dei controlli impostati, nell'ordine di lettura, per la
// conferma all'utente ("Ho impostato: Primo piano, 35mm, Golden hour").
export function describeDirection(d: StudioDirection): string[] {
  const labelOf = (list: readonly Opt[], v: string | null): string | null =>
    v ? (list.find((o) => o.v === v)?.l ?? null) : null;
  return [
    labelOf(FRAMINGS, d.framing),
    labelOf(POSES, d.pose),
    labelOf(EXPRESSIONS, d.expression),
    labelOf(COLOR_STYLES, d.colorStyle),
    labelOf(CAMERAS, d.camera),
    labelOf(LENSES, d.lens),
    labelOf(LIGHTS, d.light),
  ].filter((x): x is string => !!x);
}
