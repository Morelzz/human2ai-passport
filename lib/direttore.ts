// ──────────────────────────────────────────────────────────────────────────
// IL DIRETTORE (27/9/2026, mockup A approvato da Morelz). Mentre scrivi la
// scena in Crea, legge la frase e accende le pillole: luce, vestiti, formato,
// inquadratura, espressione, look. NON riscrive la frase e non genera niente.
// Qui la parte pura: dall'uscita grezza del modello a scelte SICURE (solo i
// valori dei cataloghi, vestiti ripuliti) e le parole da sottolineare, tenute
// solo se stanno davvero nella frase. La chiamata al modello vive nella rotta.
// ──────────────────────────────────────────────────────────────────────────

import { LIGHTS, FRAMINGS, EXPRESSIONS, POSES, validEnum } from "@/lib/studio-options";
import { MAX_VESTITI } from "@/lib/vestiti";

export const LOOK_DIRETTORE = ["naturale", "editoriale", "cinema", "bn", "flash", "pellicola"] as const;
export const FORMATI_DIRETTORE = ["verticale", "quadrato", "orizzontale"] as const;

export interface SceltaDirettore {
  luce: string | null;
  formato: (typeof FORMATI_DIRETTORE)[number] | null;
  inquadratura: string | null;
  espressione: string | null;
  posa: string | null;
  look: (typeof LOOK_DIRETTORE)[number] | null;
  // vestiti per persona: chiave = nome in scena (o "_" se c'e' una persona sola)
  vestiti: Record<string, string>;
  evidenze: string[]; // pezzi della frase che hanno deciso qualcosa, per sottolinearli
}

const pulito = (v: unknown, max: number) => String(v ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function scelteDirettore(raw: unknown, frase: string, nomi: string[]): SceltaDirettore {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const inLista = <T extends string>(lista: readonly T[], v: unknown): T | null => (typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : null);
  const vestiti: Record<string, string> = {};
  const vr = p.vestiti;
  if (vr && typeof vr === "object" && !Array.isArray(vr)) {
    for (const [chi, cosa] of Object.entries(vr as Record<string, unknown>)) {
      const c = pulito(cosa, MAX_VESTITI);
      if (!c) continue;
      // solo nomi davvero in scena; una persona sola si scrive sotto "_"
      const nome = nomi.find((n) => n.toLowerCase() === chi.toLowerCase());
      if (nome) vestiti[nome] = c;
      else if (nomi.length <= 1) vestiti["_"] = c;
    }
  }
  const bassa = frase.toLowerCase();
  const evidenze = (Array.isArray(p.evidenze) ? p.evidenze : [])
    .map((e) => pulito(e, 60))
    .filter((e) => e.length >= 3 && bassa.includes(e.toLowerCase()))
    .slice(0, 10);
  return {
    luce: validEnum(LIGHTS, p.luce),
    formato: inLista(FORMATI_DIRETTORE, p.formato),
    inquadratura: validEnum(FRAMINGS, p.inquadratura),
    espressione: validEnum(EXPRESSIONS, p.espressione),
    posa: validEnum(POSES, p.posa),
    look: inLista(LOOK_DIRETTORE, p.look),
    vestiti,
    evidenze,
  };
}

/** Dove sottolineare: intervalli [inizio, fine) nella frase, senza sovrapposizioni. */
export function intervalli(frase: string, evidenze: string[]): [number, number][] {
  const bassa = frase.toLowerCase();
  const out: [number, number][] = [];
  for (const e of evidenze) {
    const i = bassa.indexOf(e.toLowerCase());
    if (i < 0) continue;
    const f = i + e.length;
    if (out.some(([a, b]) => i < b && f > a)) continue;
    out.push([i, f]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}
