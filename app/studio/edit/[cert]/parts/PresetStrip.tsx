"use client";

// ──────────────────────────────────────────────────────────────────────────
// PresetStrip — striscia orizzontale dei 12 preset (miniatura = la TUA immagine
// col filtro del preset) + cursore Intensita (0..100, default 85). Dal
// prototipo design/anteprima_editor_mobile.html (.preset/.fstrip/.intens).
// ──────────────────────────────────────────────────────────────────────────

import { PRESETS, type Preset } from "@/lib/editor/types";

// Filtro del preset a piena forza (per la miniatura): nessuna luce/colore.
function presetThumbFilter(p: Preset): string {
  return `grayscale(${p.gray}) sepia(${p.sep}) saturate(${p.sat}) contrast(${p.con}) brightness(${p.bri}) hue-rotate(${p.hue}deg)`;
}

export function PresetStrip({
  imageUrl,
  preset,
  intensity,
  onPreset,
  onIntensity,
}: {
  imageUrl: string;
  preset: string;
  intensity: number; // 0..1
  onPreset: (key: string) => void;
  onIntensity: (v: number) => void;
}) {
  const pct = Math.round(intensity * 100);
  return (
    <div>
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">Preset</span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map((p) => {
          const on = p.key === preset;
          return (
            <button key={p.key} type="button" onClick={() => onPreset(p.key)} className="w-[54px] shrink-0 text-center">
              <span
                className={`block h-[54px] w-[54px] overflow-hidden rounded-lg border-[1.5px] transition-colors ${
                  on ? "border-amber shadow-[0_0_0_2px_var(--tint-amber)]" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-full w-full object-cover" style={{ filter: presetThumbFilter(p) }} />
              </span>
              <span className={`mt-1 block truncate text-[0.55rem] ${on ? "text-foreground" : "text-muted"}`}>{p.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center gap-2.5 text-[0.72rem] text-muted">
        <span className="shrink-0">Intensità</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onIntensity(Number(e.target.value) / 100)}
          className="flex-1 accent-[#F2A93B]"
          aria-label="Intensità del preset"
        />
        <span className="w-9 shrink-0 text-right font-mono text-foreground">{pct}%</span>
      </div>
    </div>
  );
}
