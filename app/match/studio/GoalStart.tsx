"use client";

// ──────────────────────────────────────────────────────────────────────────
// GoalStart — schermata di AVVIO per obiettivo ("Cosa vuoi creare con …").
// E' la prima cosa che l'utente vede dopo aver scelto un volto: sceglie un
// obiettivo (Post Instagram, Foto prodotto, Ritratto LinkedIn, Banner ADV) e
// noi prepariamo formato, inquadratura, luce, stile colore e ottica. "Scena
// libera" salta i preset e porta dritti alla composizione manuale.
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.start/.goals).
// Sorgente di verita dei DATI: lib/studio-options.ts (GOALS).
// ──────────────────────────────────────────────────────────────────────────

import { GOALS, type GoalPreset } from "@/lib/studio-options";

// Riga descrittiva per ogni obiettivo (la stessa del prototipo: ".gd").
// Tenuta qui perche' e' copy di presentazione, non un parametro di generazione.
const GOAL_DESC: Record<string, string> = {
  ig: "verticale, mezzo busto, luce naturale",
  ecom: "quadrato, figura intera, luce studio",
  linkedin: "verticale, primo piano, 85mm",
  adv: "orizzontale, cinematico, golden hour",
};

// Glifo per ogni obiettivo (icona "gi" del prototipo, resa testuale).
const GOAL_ICON: Record<string, string> = {
  ig: "◉",
  ecom: "₿",
  linkedin: "■",
  adv: "☺",
};

export function GoalStart({ alias, onPick }: { alias: string; onPick: (goal: string) => void }) {
  // Obiettivi con preset (griglia 2 colonne) e "Scena libera" (full-width, tratteggiato).
  const presetGoals = GOALS.filter((g) => g.v !== "libera");
  const libera = GOALS.find((g) => g.v === "libera");

  return (
    <div className="mt-5">
      <h2 className="text-2xl font-extralight tracking-[-0.03em] text-foreground">
        Cosa vuoi creare con <span className="font-semibold">{alias}</span>?
      </h2>
      <p className="mt-1.5 mb-4 text-sm leading-relaxed text-muted">
        Scegli l&apos;obiettivo: prepariamo noi formato, inquadratura e luce. Poi rifinisci.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {presetGoals.map((g: GoalPreset) => (
          <button
            key={g.v}
            type="button"
            onClick={() => onPick(g.v)}
            className="focus-ring rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-amber/50 hover:bg-amber/10"
          >
            <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber/15 text-base text-amber">
              {GOAL_ICON[g.v] ?? "◉"}
            </span>
            <span className="block text-sm font-semibold text-foreground">{g.l}</span>
            {GOAL_DESC[g.v] && (
              <span className="mt-0.5 block text-[0.7rem] leading-snug text-faint">{GOAL_DESC[g.v]}</span>
            )}
          </button>
        ))}

        {libera && (
          <button
            type="button"
            onClick={() => onPick(libera.v)}
            className="focus-ring col-span-2 rounded-2xl border border-dashed border-border bg-transparent px-3 py-3 text-center transition-colors hover:border-amber/50 hover:text-foreground"
          >
            <span className="text-sm font-medium text-muted">Scena libera, parto da zero →</span>
          </button>
        )}
      </div>
    </div>
  );
}
