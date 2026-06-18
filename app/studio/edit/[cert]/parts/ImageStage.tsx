"use client";

// ──────────────────────────────────────────────────────────────────────────
// ImageStage — l'immagine dell'editor (FISSA in alto su mobile, sticky a
// sinistra su desktop). Porta il CSS `filter` dell'anteprima live; i layer
// vignettatura e grana stanno sopra. "Tieni premuto: originale" mostra
// l'immagine senza modifiche finche resta premuto. Markup/etichette dal
// prototipo design/anteprima_editor_mobile.html (.stage/.canvas/.imgtools).
// ──────────────────────────────────────────────────────────────────────────

import type { ComposedPreview } from "@/lib/editor/preview";

// Rumore per la grana (stesso SVG del prototipo, riga 44).
const GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function ImageStage({
  imageUrl,
  preview,
  comparing,
  onCompareStart,
  onCompareEnd,
}: {
  imageUrl: string;
  preview: ComposedPreview;
  comparing: boolean;
  onCompareStart: () => void;
  onCompareEnd: () => void;
}) {
  // Durante il confronto: nessun filtro, nessun layer.
  const filter = comparing ? "none" : preview.filter;
  const vigOpacity = comparing ? 0 : preview.vig;
  const grainOpacity = comparing ? 0 : preview.grain;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-obsidian-3 shadow-[0_16px_44px_rgba(0,0,0,0.4)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Anteprima della generazione"
        className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-100"
        style={{ filter }}
      />
      {/* Vignettatura */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: vigOpacity,
          background: "radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.85))",
        }}
      />
      {/* Grana */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{ opacity: grainOpacity, backgroundSize: "170px 170px", backgroundImage: GRAIN_BG }}
      />

      <div className="absolute left-2.5 top-2.5 rounded-full border border-border bg-obsidian/50 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.07em] text-foreground/70 backdrop-blur-sm">
        anteprima · watermark
      </div>
      <div className="absolute bottom-2.5 right-2.5 font-mono text-[0.6rem] tracking-[0.12em] text-foreground/55">SEMBLIC</div>

      <button
        type="button"
        onPointerDown={onCompareStart}
        onPointerUp={onCompareEnd}
        onPointerLeave={onCompareEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`absolute bottom-2.5 left-2.5 inline-flex select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] backdrop-blur-sm transition-colors ${
          comparing ? "border-amber bg-amber text-[#412402]" : "border-border bg-obsidian/55 text-foreground"
        }`}
      >
        <span aria-hidden>👁</span> Tieni premuto: originale
      </button>
    </div>
  );
}
