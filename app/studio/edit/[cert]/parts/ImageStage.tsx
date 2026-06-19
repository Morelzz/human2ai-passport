"use client";

// ──────────────────────────────────────────────────────────────────────────
// ImageStage — anteprima a PIXEL REALI (canvas). Carica l'immagine una volta a
// risoluzione di lavoro, e ad ogni cambio di stato riprocessa i pixel con la
// pipeline condivisa (lib/editor/pipeline) e li ridisegna. Cosi ogni parametro
// (temperatura, HSL selettivo, nitidezza reale, ...) funziona DAVVERO e
// l'anteprima combacia con l'export server. "Tieni premuto: originale" mostra i
// pixel grezzi. Mobile fissa in alto / desktop sticky (gestito dal padre).
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type { EditState } from "@/lib/editor/types";
import { processImage } from "@/lib/editor/pipeline";

const WORK_MAX = 640; // risoluzione di lavoro dell'anteprima (l'export e a piena res)

export function ImageStage({
  imageUrl,
  state,
  comparing,
  onCompareStart,
  onCompareEnd,
}: {
  imageUrl: string;
  state: EditState;
  comparing: boolean;
  onCompareStart: () => void;
  onCompareEnd: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const srcRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  // Carica l'immagine (CORS) e cattura i pixel originali a risoluzione di lavoro.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, WORK_MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, w, h);
      srcRef.current = { data: octx.getImageData(0, 0, w, h).data, w, h };
      const cv = canvasRef.current;
      if (cv) {
        cv.width = w;
        cv.height = h;
      }
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Ridisegna su cambio stato/confronto. Throttle con setTimeout (coalesce i
  // cambi rapidi dei cursori; scatta anche a tab nascosta, a differenza di rAF).
  useEffect(() => {
    if (!ready || !srcRef.current || !canvasRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const src = srcRef.current;
      const cv = canvasRef.current;
      if (!src || !cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const out = new Uint8ClampedArray(src.data); // copia dei pixel originali
      if (!comparing) processImage(out, src.w, src.h, state);
      ctx.putImageData(new ImageData(out, src.w, src.h), 0, 0);
    }, 24);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, comparing, ready]);

  return (
    <div className="relative h-[40dvh] w-full overflow-hidden rounded-2xl border border-border bg-obsidian-3 shadow-[0_16px_44px_rgba(0,0,0,0.4)] lg:h-auto lg:aspect-[4/5]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />
      {!ready && <div className="absolute inset-0 grid place-items-center text-[0.7rem] text-faint">Carico l&apos;anteprima…</div>}

      <div className="absolute left-2.5 top-2.5 rounded-full border border-border bg-obsidian/50 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.07em] text-foreground/70 backdrop-blur-sm">
        anteprima
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
