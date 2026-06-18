"use client";

// ──────────────────────────────────────────────────────────────────────────
// ColorStyleRow — blocco "Stile colore" (in generazione). Riga di chip
// orizzontalmente scrollabile, ognuna con un pallino-campione (.sw, un
// gradiente CSS) + etichetta. Selezione singola, scrive su colorStyle.
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.blk
// "Stile colore", .hwrap/.chiprow/.chip/.sw), tradotto nei token dell'app:
// label amber, chip su superficie elevated, stato attivo amber pieno.
// I gradienti dei campioni sono presi 1:1 dal prototipo, mappati su .v.
// ──────────────────────────────────────────────────────────────────────────

import { COLOR_STYLES } from "@/lib/studio-options";

// Gradiente del campione per ogni stile colore (dal prototipo, chiave = .v).
const SWATCH: Record<string, string> = {
  naturale: "linear-gradient(135deg,#c9a884,#6a5340)",
  bn: "linear-gradient(135deg,#e8e8e8,#333)",
  pastello: "linear-gradient(135deg,#f3d9e0,#cfe0ec)",
  cinematico: "linear-gradient(135deg,#e08a3c,#1f6f73)",
  contrasto: "linear-gradient(135deg,#fff,#000)",
  flash: "linear-gradient(135deg,#ffffff,#9a9a9a)",
};

export function ColorStyleRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">
        Stile colore <span className="font-normal normal-case tracking-normal text-faint">· in generazione</span>
      </span>

      {/* .hwrap: riga scrollabile con sfumatura sul bordo destro (segnala lo
          scroll). La sfumatura va verso --bg (obsidian) come nel prototipo. */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {COLOR_STYLES.map((c) => {
            const active = c.v === value;
            return (
              <button
                key={c.v}
                type="button"
                onClick={() => onChange(c.v)}
                aria-pressed={active}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-[0.78rem] font-medium transition-colors ${
                  active
                    ? "border-amber bg-amber text-[#412402]"
                    : "border-border bg-elevated text-muted hover:text-foreground"
                }`}
              >
                <span
                  className="h-[13px] w-[13px] shrink-0 rounded border border-black/25"
                  style={{ background: SWATCH[c.v] }}
                  aria-hidden
                />
                {c.l}
              </button>
            );
          })}
        </div>
        {/* Fade sul bordo destro (.hwrap::after) verso lo sfondo pagina. */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-1 w-8"
          style={{ background: "linear-gradient(90deg,rgba(12,15,23,0),var(--bg))" }}
          aria-hidden
        />
      </div>
    </div>
  );
}
