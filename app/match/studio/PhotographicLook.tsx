"use client";

// ──────────────────────────────────────────────────────────────────────────
// PhotographicLook — blocco "Look fotografico". Tre sotto-selezioni a scelta
// singola: Macchina (CAMERAS, griglia 2x2), Ottica (LENSES, riga monospace
// coi mm + riga di onesta), Luce (LIGHTS, riga di chip). Scrive su
// camera/lens/light, gia' threadati via props in StudioPanel.
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.blk
// "Look fotografico", .cams/.cam, .lensrow, .chiprow/.chip), tradotto nei
// token dell'app: label amber, superfici elevated, stato attivo amber.
// Riga di onesta sull'ottica: docs/STUDIO_GEN_CAMERA_EDITING_SPEC.md
// ("Note di onesta") — l'ottica e' simulata, non una resa ottica fisica.
// ──────────────────────────────────────────────────────────────────────────

import { CAMERAS, LENSES, LIGHTS } from "@/lib/studio-options";

// Icona breve per ogni macchina (glifo del prototipo), chiave = .v.
const CAM_ICON: Record<string, string> = {
  analogica: "◎",
  full_frame: "▢",
  medio_formato: "▤",
  polaroid: "▣",
};
// Didascalia breve sotto al nome della macchina (dal prototipo), chiave = .v.
const CAM_CAP: Record<string, string> = {
  analogica: "grana naturale",
  full_frame: "nitido",
  medio_formato: "dettaglio",
  polaroid: "vintage",
};

// Riga di chip scrollabile con sfumatura sul bordo destro (.hwrap). Riutilizzata
// da Ottica e Luce. mono=true rende le chip monospace e a larghezza minima fissa
// (come .lensrow del prototipo). La sfumatura va verso --bg (obsidian).
function ScrollChips({
  options,
  value,
  onChange,
  mono = false,
  label,
}: {
  options: readonly { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  label: string;
}) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={label}>
        {options.map((o) => {
          const active = o.v === value;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              aria-pressed={active}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-[0.78rem] font-medium transition-colors ${
                mono ? "min-w-[48px] text-center font-mono" : ""
              } ${
                active
                  ? "border-amber bg-amber text-[#412402]"
                  : "border-border bg-elevated text-muted hover:text-foreground"
              }`}
            >
              {o.l}
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-1 w-8"
        style={{ background: "linear-gradient(90deg,rgba(12,15,23,0),var(--bg))" }}
        aria-hidden
      />
    </div>
  );
}

export function PhotographicLook({
  camera,
  lens,
  light,
  onCamera,
  onLens,
  onLight,
}: {
  camera: string;
  lens: string;
  light: string;
  onCamera: (v: string) => void;
  onLens: (v: string) => void;
  onLight: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">
        Look fotografico
      </span>

      {/* Macchina: griglia 2x2 (.cams). Ogni voce: icona + nome + didascalia. */}
      <span className="mb-1.5 mt-1 block text-[0.66rem] font-medium text-muted">Macchina</span>
      <div className="grid grid-cols-2 gap-2">
        {CAMERAS.map((c) => {
          const active = c.v === camera;
          return (
            <button
              key={c.v}
              type="button"
              onClick={() => onCamera(c.v)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-colors ${
                active ? "border-amber bg-amber/10" : "border-border bg-elevated hover:border-amber/40"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-obsidian text-xs ${
                  active ? "text-amber" : "text-muted"
                }`}
                aria-hidden
              >
                {CAM_ICON[c.v] ?? c.l.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.75rem] font-medium text-foreground">{c.l}</span>
                <span className="block truncate text-[0.6rem] text-faint">{CAM_CAP[c.v] ?? ""}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Ottica: riga monospace coi mm (.lensrow) + riga di onesta discreta. */}
      <span className="mb-1.5 mt-3 block text-[0.66rem] font-medium text-muted">Ottica</span>
      <ScrollChips options={LENSES} value={lens} onChange={onLens} mono label="Ottica" />
      <p className="mt-1.5 text-[0.62rem] leading-relaxed text-faint">
        L&apos;ottica è simulata: il modello imita il look, non è una resa ottica fisica.
      </p>

      {/* Luce: riga di chip (.chiprow). */}
      <span className="mb-1.5 mt-3 block text-[0.66rem] font-medium text-muted">Luce</span>
      <ScrollChips options={LIGHTS} value={light} onChange={onLight} label="Luce" />
    </div>
  );
}
