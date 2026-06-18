"use client";

// ──────────────────────────────────────────────────────────────────────────
// HslMixer — Mixer colore HSL: 3 settori (Tonalita, Saturazione, Luminanza),
// in ciascuno gli 8 colori con cursore -100..100. Dal prototipo
// design/anteprima_editor_mobile.html (.hslmode/.hslrow).
// In ANTEPRIMA l'effetto e aggregato (composeFilter): l'HSL selettivo "vero"
// per gamma di tinta arrivera nella resa server con sharp (fase 3).
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { HSL_COLORS, type EditState } from "@/lib/editor/types";

export type HslMode = "hue" | "sat" | "lum";
const MODES: ReadonlyArray<readonly [HslMode, string]> = [
  ["hue", "Tonalità"],
  ["sat", "Saturazione"],
  ["lum", "Luminanza"],
];

export function HslMixer({
  hsl,
  onChange,
}: {
  hsl: EditState["hsl"];
  onChange: (mode: HslMode, key: string, value: number) => void;
}) {
  const [mode, setMode] = useState<HslMode>("hue");
  const vals = hsl[mode];

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-[0.7rem] font-medium transition-colors ${
              mode === m ? "border-amber bg-amber text-[#412402]" : "border-border bg-elevated text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {HSL_COLORS.map((c) => {
        const v = vals[c.key] ?? 0;
        return (
          <div key={c.key} className="flex items-center gap-2.5 py-1.5">
            <span className="h-4 w-4 shrink-0 rounded-[5px] border border-black/30" style={{ background: c.swatch }} aria-hidden />
            <span className="w-[72px] shrink-0 text-[0.76rem]">{c.label}</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={v}
              onChange={(e) => onChange(mode, c.key, Number(e.target.value))}
              className="flex-1 accent-[#F2A93B]"
              aria-label={`${c.label}, ${mode}`}
            />
            <span className={`w-7 shrink-0 text-right font-mono text-[0.68rem] ${v !== 0 ? "text-amber" : "text-faint"}`}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}
