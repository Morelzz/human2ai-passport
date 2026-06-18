"use client";

// ──────────────────────────────────────────────────────────────────────────
// AvatarHero — card "hero" del volto scelto nello Studio.
// Mostra ritratto, alias, badge tier (per i SOUL = "ECHO"), lo stato di
// consenso per la categoria della ricerca (salvia se consenziente, coral se
// escluso/non approvato) e l'azione "Cambia volto" (torna ai risultati).
// Sotto, opzionale, la "goalpill" dell'obiettivo scelto con la x per azzerarlo.
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.hero/.info)
// e design/anteprima_match_studio_redesign.html (.ava).
// ──────────────────────────────────────────────────────────────────────────

import { ScannerFrame } from "@/components/motion/ScannerFrame";

export interface AvatarHeroProps {
  alias: string;
  handle: string;
  portrait: string | null;
  tierLabel: string; // per i SOUL = "ECHO" (da TIER_CONFIG)
  // Consenso rispetto alla ricerca (stessa logica del vecchio header).
  category: string | null;
  approvedCategories: string[];
  excludedCategories: string[];
  // Azione "Cambia volto": torna ai risultati.
  onChangeFace: () => void;
  // Obiettivo selezionato (goalpill): se presente, mostra la pillola + la x.
  goalLabel?: string | null;
  onClearGoal?: () => void;
}

export function AvatarHero(props: AvatarHeroProps) {
  const {
    alias,
    handle,
    portrait,
    tierLabel,
    onChangeFace,
    goalLabel,
    onClearGoal,
  } = props;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3.5">
        <ScannerFrame className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-obsidian-3">
          {portrait && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt={alias} className="h-full w-full object-cover" />
          )}
        </ScannerFrame>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-semibold tracking-[-0.01em] text-foreground">{alias}</span>
            <span className="shrink-0 rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[0.62rem] font-bold text-teal">
              {tierLabel}
            </span>
          </div>
          <div className="truncate font-mono text-xs text-faint">@{handle}</div>
        </div>

        <button
          type="button"
          onClick={onChangeFace}
          className="shrink-0 self-start rounded-full border border-border px-3 py-1.5 text-[0.72rem] text-muted transition-colors hover:border-amber/40 hover:text-foreground"
        >
          ← Cambia volto
        </button>
      </div>

      {/* Goalpill: l'obiettivo scelto, con la x per tornare alla scelta */}
      {goalLabel && onClearGoal && (
        <div className="mt-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber">
            ✦ {goalLabel}
            <button
              type="button"
              onClick={onClearGoal}
              aria-label="Cambia obiettivo"
              className="text-muted transition-colors hover:text-foreground"
            >
              ✕
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
