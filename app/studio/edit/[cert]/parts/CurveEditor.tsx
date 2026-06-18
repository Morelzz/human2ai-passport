"use client";

// ──────────────────────────────────────────────────────────────────────────
// CurveEditor — editor curve multi-punto per 4 canali (RGB master, R, G, B).
// Tocca la linea per aggiungere un punto, trascina per modificarlo, doppio
// tocco per toglierlo (estremi esclusi), Reset per il canale. Porta della
// logica del prototipo design/anteprima_editor_mobile.html (righe 267-290).
// I punti sono in 0..100 (x input, y output). L'effetto sull'immagine passa
// per il feComponentTransfer (vedi lib/editor/curves.ts + ImageStage).
// ──────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import type { Curves, CurvePoint } from "@/lib/editor/types";

type Channel = "rgb" | "r" | "g" | "b";
const CHANNELS: ReadonlyArray<readonly [Channel, string]> = [
  ["rgb", "RGB"],
  ["r", "R"],
  ["g", "G"],
  ["b", "B"],
];
const CCOL: Record<Channel, string> = { rgb: "#F2A93B", r: "#e0584f", g: "#5aa86f", b: "#5a83c0" };

export function CurveEditor({
  curves,
  onChange,
  onReset,
}: {
  curves: Curves;
  onChange: (channel: Channel, points: CurvePoint[]) => void;
  onReset: (channel: Channel) => void;
}) {
  const [chan, setChan] = useState<Channel>("rgb");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragI = useRef(-1);
  const lastI = useRef(-1);
  const lastT = useRef(0);

  const pts = curves[chan];

  function svgXY(e: React.PointerEvent): [number, number] {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const r = svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    return [x, y];
  }
  // Indice del punto colpito (raggio di tolleranza), in coordinate schermo (y invertita).
  function hit(p: CurvePoint[], x: number, sy: number): number {
    for (let i = 0; i < p.length; i++) {
      const dx = p[i][0] - x;
      const dy = 100 - p[i][1] - sy;
      if (dx * dx + dy * dy < 42) return i;
    }
    return -1;
  }

  function onPointerDown(e: React.PointerEvent) {
    const [x, sy] = svgXY(e);
    const p = pts.map((q) => [...q] as CurvePoint);
    const i = hit(p, x, sy);
    if (i >= 0) {
      const now = performance.now();
      // Doppio tocco su un punto centrale -> rimuovi.
      if (i === lastI.current && now - lastT.current < 330) {
        if (i > 0 && i < p.length - 1) {
          p.splice(i, 1);
          onChange(chan, p);
        }
        lastI.current = -1;
        dragI.current = -1;
        return;
      }
      lastI.current = i;
      lastT.current = now;
      dragI.current = i;
    } else {
      const y = 100 - sy;
      p.push([x, y]);
      p.sort((a, b) => a[0] - b[0]);
      dragI.current = p.findIndex((z) => z[0] === x && z[1] === y);
      lastI.current = -1;
      onChange(chan, p);
    }
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragI.current < 0) return;
    const [x, sy] = svgXY(e);
    const p = pts.map((q) => [...q] as CurvePoint);
    const di = dragI.current;
    const y = 100 - sy;
    if (di === 0) {
      p[0][1] = y; // estremo sinistro: solo verticale
    } else if (di === p.length - 1) {
      p[di][1] = y; // estremo destro: solo verticale
    } else {
      const lo = p[di - 1][0] + 1;
      const hi = p[di + 1][0] - 1;
      p[di][0] = Math.max(lo, Math.min(hi, x));
      p[di][1] = y;
    }
    onChange(chan, p);
  }

  function endDrag() {
    dragI.current = -1;
  }

  const d = `M ${pts[0][0]},${100 - pts[0][1]}` + pts.slice(1).map((q) => ` L ${q[0]},${100 - q[1]}`).join("");

  return (
    <div>
      <div className="mb-2.5 flex gap-1.5">
        {CHANNELS.map(([c, label]) => {
          const on = chan === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChan(c)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-[0.72rem] font-semibold transition-colors ${
                on ? "" : "border-border bg-elevated text-muted"
              }`}
              style={on ? { borderColor: CCOL[c], background: CCOL[c], color: c === "rgb" ? "#412402" : "#fff" } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mx-auto max-w-[300px] rounded-xl border border-border bg-obsidian p-2">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="block aspect-square w-full touch-none"
          style={{ cursor: "ns-resize" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(242,233,216,0.14)" strokeWidth="0.6" />
          <line x1="33" y1="0" x2="33" y2="100" stroke="rgba(242,233,216,0.06)" strokeWidth="0.5" />
          <line x1="66" y1="0" x2="66" y2="100" stroke="rgba(242,233,216,0.06)" strokeWidth="0.5" />
          <line x1="0" y1="33" x2="100" y2="33" stroke="rgba(242,233,216,0.06)" strokeWidth="0.5" />
          <line x1="0" y1="66" x2="100" y2="66" stroke="rgba(242,233,216,0.06)" strokeWidth="0.5" />
          <path d={d} fill="none" stroke={CCOL[chan]} strokeWidth="2" />
          {pts.map((q, i) => (
            <circle key={i} cx={q[0]} cy={100 - q[1]} r="3.6" fill={CCOL[chan]} stroke="#0C0F17" strokeWidth="0.9" />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex-1 text-[0.62rem] leading-snug text-faint">
          Tocca la linea per aggiungere un punto, trascina per modificarlo, doppio tocco per toglierlo.
        </span>
        <button
          type="button"
          onClick={() => onReset(chan)}
          className="shrink-0 rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-[0.68rem] text-muted transition-colors hover:border-amber/40 hover:text-foreground"
        >
          Reset curva
        </button>
      </div>
    </div>
  );
}
