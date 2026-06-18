"use client";

// ──────────────────────────────────────────────────────────────────────────
// ExportSheet — pannello Esporta (bottom sheet su mobile, modale centrato su
// desktop). Upscale 2K/4K (unico posto dove vive l'upscale, spec 4.11),
// formato per piattaforma, "Scarica con provenienza" (resa server delle
// modifiche) e "Condividi come Storia". Dal prototipo
// design/anteprima_editor_mobile.html (.sheet/.upcard/.fmtgrid/.actions).
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ShareStoryButton } from "@/components/share/ShareStoryButton";

const FORMATS = [
  { v: "ig", l: "IG post", d: "4:5" },
  { v: "story", l: "Storia", d: "9:16" },
  { v: "li", l: "LinkedIn", d: "1.91:1" },
  { v: "ecom", l: "E-commerce", d: "1:1" },
];

export function ExportSheet({
  open,
  onClose,
  onDownload,
  downloading,
  cert,
}: {
  open: boolean;
  onClose: () => void;
  onDownload: (opts: { upscale: "2k" | "4k" | null; format: string | null }) => void;
  downloading: boolean;
  cert: string;
}) {
  const [upscale, setUpscale] = useState<"2k" | "4k" | null>(null);
  const [format, setFormat] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Esporta">
      <button type="button" aria-label="Chiudi" onClick={onClose} className="absolute inset-0 cursor-default bg-black/50" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.5)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-[min(92vw,460px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-edge sm:hidden" />
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Esporta</span>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="text-lg text-faint hover:text-foreground">✕</button>
        </div>

        <div className="overflow-y-auto px-4 pb-6 pt-4">
          {/* Upscale */}
          <div className="rounded-xl border border-amber/30 bg-gradient-to-br from-amber/[0.14] to-amber/[0.04] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber text-[0.9rem] text-[#412402]" aria-hidden>▲</span>
              Upscale
            </div>
            <p className="mb-3 mt-1.5 text-[0.7rem] leading-relaxed text-muted">
              Porta la foto ad alta risoluzione mantenendo identità e dettagli. Ideale per stampa e ADV.
            </p>
            <div className="flex gap-2">
              {(["2k", "4k"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUpscale((cur) => (cur === u ? null : u))}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-[0.8rem] font-semibold transition-colors ${
                    upscale === u ? "border-amber bg-amber text-[#412402]" : "border-border bg-surface text-foreground"
                  }`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Formato per piattaforma */}
          <div className="mt-4 text-[0.7rem] font-medium text-muted">Formato per piattaforma</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setFormat((cur) => (cur === f.v ? null : f.v))}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  format === f.v ? "border-amber bg-amber/10" : "border-border bg-elevated"
                }`}
              >
                <span className={`shrink-0 rounded-[3px] border-[1.5px] ${format === f.v ? "border-amber" : "border-muted"}`} style={aspectBox(f.v)} aria-hidden />
                <span>
                  <span className="block text-[0.78rem] font-medium">{f.l}</span>
                  <span className="block text-[0.62rem] text-faint">{f.d}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Azioni */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onDownload({ upscale, format })}
              disabled={downloading}
              className="rounded-xl border border-teal/30 bg-teal/10 px-3 py-3 text-center text-[0.84rem] font-semibold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50"
            >
              {downloading ? "Preparo l'immagine…" : "Scarica con provenienza →"}
            </button>
            <ShareStoryButton
              query={`cert=${encodeURIComponent(cert)}&v=buyer`}
              filename={`semblic-story-${cert.slice(0, 8)}.png`}
              label="Condividi come Storia"
              className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-3 text-center text-[0.84rem] font-semibold text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini-rettangolo proporzionale all'aspetto del formato (icona).
function aspectBox(v: string): { width: number; height: number } {
  switch (v) {
    case "ig":
      return { width: 17, height: 21 };
    case "story":
      return { width: 13, height: 23 };
    case "li":
      return { width: 23, height: 12 };
    default:
      return { width: 19, height: 19 };
  }
}
