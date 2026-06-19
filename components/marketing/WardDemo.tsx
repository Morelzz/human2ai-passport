"use client";
import { useEffect, useRef, useState } from "react";
import "./ward-demo.css";

// Demo PUBBLICA di Ward in homepage. Regole non negoziabili (spec sez. 3):
// 100% simulata, NESSUN backend/fetch/Supabase, NESSUN input/camera/upload,
// mai "ti sto scansionando", badge DEMO + ribbon sempre visibili, una sola
// azione reale (la CTA, che vive nella sezione), si auto-anima e rispetta
// prefers-reduced-motion. Math.random qui e' lecito (codice client).
export function WardDemo() {
  const [found, setFound] = useState(1284);
  const [removed, setRemoved] = useState(9710);
  const radarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setFound((f) => f + Math.floor(Math.random() * 3));
      setRemoved((r) => r + Math.floor(Math.random() * 4));
      radarRef.current?.querySelectorAll<HTMLElement>(".blip").forEach((b) => {
        if (Math.random() > 0.6) {
          b.style.left = 18 + Math.random() * 64 + "%";
          b.style.top = 20 + Math.random() * 60 + "%";
        }
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass relative overflow-hidden rounded-[2rem] p-5 pt-6">
      <span className="absolute left-4 top-4 z-10 rounded-md border border-border bg-black/70 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-foreground">
        Anteprima simulata
      </span>
      <span
        className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em]"
        style={{
          color: "var(--amber-c)",
          borderColor: "color-mix(in srgb, var(--amber-c) 40%, transparent)",
          background: "color-mix(in srgb, var(--amber-c) 10%, transparent)",
        }}
      >
        <i className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--amber-c)", boxShadow: "0 0 7px var(--amber-c)" }} />
        Demo
      </span>

      <div ref={radarRef} className="ward-demo-radar">
        <div className="ring" />
        <div className="ring r2" />
        <div className="ring r3" />
        <div className="sweep" />
        <div className="core" />
        <span className="blip c" style={{ left: "70%", top: "34%" }} />
        <span className="blip c" style={{ left: "36%", top: "62%" }} />
        <span className="blip s" style={{ left: "60%", top: "70%" }} />
        <span className="blip s" style={{ left: "30%", top: "40%" }} />
        <span className="blip s" style={{ left: "74%", top: "56%" }} />
      </div>

      <div className="mt-3 flex justify-center gap-8">
        <div className="text-center">
          <div className="font-mono text-xl font-bold" style={{ color: "var(--blocked-c)" }}>{found.toLocaleString("it-IT")}</div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-wide text-muted">trovati questa settimana</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-xl font-bold" style={{ color: "var(--verified-c)" }}>{removed.toLocaleString("it-IT")}</div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-wide text-muted">rimossi</div>
        </div>
      </div>

      <p className="mx-2 mt-3 text-center font-mono text-[9px] leading-relaxed text-muted">
        Dati simulati a scopo illustrativo. Ward non ti sta scansionando. Analizza solo il volto di chi si iscrive e dà il consenso.
      </p>
    </div>
  );
}
