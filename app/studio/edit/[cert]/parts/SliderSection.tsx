"use client";

// ──────────────────────────────────────────────────────────────────────────
// SliderSection — sezione accordion con una lista di cursori (Luce, Colore e,
// in fase 2, Dettaglio). Una sezione aperta alla volta (gestita dal padre).
// Clic sul valore = reset di quel cursore a 0. Dal prototipo
// design/anteprima_editor_mobile.html (.acc/.adj).
// ──────────────────────────────────────────────────────────────────────────

import type { SliderDef } from "@/lib/editor/types";

export function SliderSection({
  title,
  badge,
  defs,
  values,
  onChange,
  open,
  onToggle,
}: {
  title: string;
  badge?: string;
  defs: SliderDef[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">{title}</span>
        {badge && <span className="font-mono text-[0.55rem] tracking-normal text-faint">{badge}</span>}
        <span className={`ml-auto text-faint transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>▾</span>
      </button>
      {open && (
        <div className="border-t border-border/50 px-4 pb-3 pt-1">
          {defs.map((def) => {
            const [key, label, min = -100, max = 100] = def;
            const v = values[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-2.5 py-1.5">
                <span className="w-[88px] shrink-0 text-[0.78rem]">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={v}
                  onChange={(e) => onChange(key, Number(e.target.value))}
                  className="flex-1 accent-[#F2A93B]"
                  aria-label={label}
                />
                <button
                  type="button"
                  onClick={() => onChange(key, 0)}
                  aria-label={`Azzera ${label}`}
                  className={`w-8 shrink-0 text-right font-mono text-[0.7rem] ${v !== 0 ? "text-amber" : "text-faint"}`}
                >
                  {v}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
