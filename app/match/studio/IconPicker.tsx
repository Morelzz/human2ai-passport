"use client";

// ──────────────────────────────────────────────────────────────────────────
// IconPicker — selettore singolo riutilizzabile (campo .field + bottom sheet).
// Usato sia per "Inquadratura" (FRAMINGS) sia per "Espressione" (EXPRESSIONS):
// stessa struttura del PosePicker ma con una griglia piatta (niente categorie).
// Le icone (silhouette inquadratura / faccine espressione) sono portate dal
// prototipo e mappate sul valore .v; se manca una icona si rende l'iniziale.
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.field/.sheet).
// NB: in preview headless l'animazione translateY e' ferma, ma open/close toggla.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";

type IconOpt = { v: string; l: string };

// Silhouette inquadratura (oggetto FRAME del prototipo), per valore di FRAMINGS.
const FRAME_ICON: Record<string, string> = {
  primo_piano:
    '<rect x="3" y="3" width="34" height="54" rx="4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/><circle cx="20" cy="28" r="15" fill="currentColor"/><rect x="6" y="46" width="28" height="14" rx="7" fill="currentColor"/>',
  mezzo_busto:
    '<rect x="3" y="3" width="34" height="54" rx="4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/><circle cx="20" cy="17" r="8" fill="currentColor"/><rect x="9" y="27" width="22" height="30" rx="9" fill="currentColor"/>',
  figura_intera:
    '<rect x="3" y="3" width="34" height="54" rx="4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/><g fill="currentColor"><circle cx="20" cy="14" r="5"/><rect x="15.5" y="20" width="9" height="15" rx="4.5"/><rect x="16" y="34" width="3.4" height="17" rx="1.7"/><rect x="20.6" y="34" width="3.4" height="17" rx="1.7"/></g>',
  americano:
    '<rect x="3" y="3" width="34" height="54" rx="4" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/><g fill="currentColor"><circle cx="20" cy="13" r="6.2"/><rect x="13" y="20" width="14" height="20" rx="6"/><rect x="15" y="40" width="4" height="17" rx="2"/><rect x="21" y="40" width="4" height="17" rx="2"/></g>',
};

// Faccine espressione (oggetto FACE del prototipo), per valore di EXPRESSIONS.
const FACE_ICON: Record<string, string> = {
  naturale:
    '<circle cx="20" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.5" cy="27" r="1.7" fill="currentColor"/><circle cx="25.5" cy="27" r="1.7" fill="currentColor"/><line x1="15" y1="36" x2="25" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sorriso:
    '<circle cx="20" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.5" cy="27" r="1.7" fill="currentColor"/><circle cx="25.5" cy="27" r="1.7" fill="currentColor"/><path d="M14 34 Q20 40 26 34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  serio:
    '<circle cx="20" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><line x1="11.5" y1="23.5" x2="16.5" y2="22.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="23.5" y1="22.8" x2="28.5" y2="23.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="14.5" cy="27.5" r="1.6" fill="currentColor"/><circle cx="25.5" cy="27.5" r="1.6" fill="currentColor"/><path d="M15 37 Q20 35.4 25 37" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  pensieroso:
    '<circle cx="20" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><line x1="11.5" y1="24.5" x2="16.5" y2="24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="23.5" y1="22.2" x2="28.5" y2="23.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="14.5" cy="28" r="1.6" fill="currentColor"/><circle cx="25.5" cy="28" r="1.6" fill="currentColor"/><path d="M16 37 Q20 36 23.5 37.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  risata:
    '<circle cx="20" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.5" cy="26" r="1.7" fill="currentColor"/><circle cx="25.5" cy="26" r="1.7" fill="currentColor"/><path d="M13 33 Q20 43 27 33 Z" fill="currentColor"/>',
};

// Insieme di icone disponibili: l'IconPicker sceglie da solo la famiglia giusta
// in base ai valori che riceve (inquadrature vs espressioni). Niente prop extra.
const ALL_ICONS: Record<string, string> = { ...FRAME_ICON, ...FACE_ICON };

// Rende l'icona di una voce; se non c'e' una silhouette, mostra l'iniziale.
function OptGlyph({ value, label, className }: { value: string; label: string; className?: string }) {
  const svg = ALL_ICONS[value];
  if (svg) {
    return <svg viewBox="0 0 40 60" className={className} dangerouslySetInnerHTML={{ __html: svg }} aria-hidden />;
  }
  return <span className={`grid place-items-center text-base font-semibold ${className ?? ""}`} aria-hidden>{label.charAt(0)}</span>;
}

export function IconPicker({
  label,
  sheetTitle,
  options,
  value,
  onChange,
}: {
  label: string;
  sheetTitle: string;
  // readonly + struttura larga: i cataloghi (FRAMINGS/EXPRESSIONS) sono
  // "as const" e hanno anche .token, quindi sono assegnabili a {v,l}.
  options: readonly IconOpt[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.v === value) ?? options[0];

  return (
    <div className="mt-4">
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">{label}</span>

      {/* Campo: icona + titolo voce + hint + chevron. Apre il foglio. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-elevated px-3 py-3 text-left transition-colors hover:border-amber/40"
      >
        <span className="flex h-[46px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-border bg-obsidian text-amber">
          <OptGlyph value={current.v} label={current.l} className="h-[38px] w-[26px]" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-foreground">{current.l}</span>
          <span className="block text-[0.7rem] text-faint">tocca per scegliere</span>
        </span>
        <span className="text-faint" aria-hidden>▾</span>
      </button>

      {/* Foglio inferiore: scrim + pannello che scorre su (translateY). */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={sheetTitle}>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80vh] translate-y-0 flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-transform duration-200">
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-edge" />
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-foreground">{sheetTitle}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi" className="text-lg text-faint hover:text-foreground">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-6 pt-3">
              <div className="grid grid-cols-3 gap-2.5">
                {options.map((o) => {
                  const active = o.v === value;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => {
                        onChange(o.v);
                        setOpen(false);
                      }}
                      aria-pressed={active}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={`grid aspect-[3/4] w-full place-items-center rounded-xl border-[1.5px] transition-colors ${
                          active ? "border-amber bg-amber/10 text-amber" : "border-border bg-elevated text-muted"
                        }`}
                      >
                        <OptGlyph value={o.v} label={o.l} className="h-16 w-12" />
                      </span>
                      <span className="text-center text-[0.62rem] leading-tight text-muted">{o.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
