"use client";

import { useEffect, useRef } from "react";

// ──────────────────────────────────────────────────────────────────────────
// COSTELLAZIONE-VOLTO (sistema "Dala ibrido", docs/DESIGN.md).
// Migliaia di micro-forme geometriche (cerchi, triangoli, rombi, quadrati,
// 1–3.5px) che si addensano in un PROFILO UMANO sul nero: la tesi di HUMAN2AI
// resa immagine — il registro è fatto di persone, punto per punto.
// Canvas 2D leggero: drift per-particella, DPR-aware, densità ridotta su
// mobile, statico sotto prefers-reduced-motion.
// ──────────────────────────────────────────────────────────────────────────

type Particle = {
  x: number; y: number;       // posizione base (px canvas)
  size: number;               // 1.2–3.4 px
  shape: 0 | 1 | 2 | 3;       // cerchio | triangolo | rombo | quadrato
  color: string;
  amp: number;                // ampiezza drift
  speed: number;              // velocità drift
  phase: number;              // sfasamento
};

// Palette particelle (ibrido): osso tenue dominante + viola autorità +
// scintille teal/crimson (i nostri colori-stato, qui come vita nel campo).
function pickColor(rng: () => number): string {
  const r = rng();
  if (r < 0.62) return `rgba(255,255,255,${0.22 + rng() * 0.5})`;
  if (r < 0.86) return `rgba(139,71,240,${0.5 + rng() * 0.5})`;
  if (r < 0.94) return `rgba(0,168,150,${0.45 + rng() * 0.45})`;
  return `rgba(224,0,111,${0.4 + rng() * 0.4})`;
}

// PRNG deterministico: stessa costellazione a ogni visita (identità, non rumore).
function xorshift(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// Sagoma: profilo umano rivolto a sinistra, disegnato su un canvas offscreen
// 200×200 e campionato (alpha>0 ⇒ il punto è "dentro il volto").
function faceMask(): { ctx: CanvasRenderingContext2D; size: number } | null {
  const size = 200;
  const off = document.createElement("canvas");
  off.width = size; off.height = size;
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const p = new Path2D();
  // Cranio e retro
  p.moveTo(116, 8);
  p.quadraticCurveTo(164, 16, 172, 56);
  p.quadraticCurveTo(176, 88, 160, 116);
  p.lineTo(152, 144);
  p.quadraticCurveTo(148, 168, 160, 192);
  // Base collo
  p.lineTo(92, 192);
  // Gola e mento
  p.quadraticCurveTo(96, 168, 84, 152);
  p.quadraticCurveTo(72, 144, 76, 132);
  // Labbra (incavo)
  p.lineTo(68, 124);
  p.quadraticCurveTo(62, 120, 68, 114);
  p.lineTo(62, 110);
  p.quadraticCurveTo(56, 106, 66, 100);
  // Naso
  p.lineTo(54, 92);
  p.quadraticCurveTo(52, 88, 60, 84);
  p.lineTo(76, 60);
  // Fronte
  p.quadraticCurveTo(80, 44, 92, 28);
  p.quadraticCurveTo(100, 12, 116, 8);
  p.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill(p);
  return { ctx, size };
}

export function FaceConstellation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mask = faceMask();
    if (!mask) return;
    const maskData = mask.ctx.getImageData(0, 0, mask.size, mask.size).data;
    const inside = (nx: number, ny: number) => {
      const mx = Math.floor(nx * mask.size);
      const my = Math.floor(ny * mask.size);
      return maskData[(my * mask.size + mx) * 4 + 3] > 0;
    };

    let raf = 0;
    let particles: Particle[] = [];
    let W = 0, H = 0;

    function build() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const rng = xorshift(0x483241);
      const isSmall = W < 560;
      const target = isSmall ? 1100 : 2300;   // dentro il volto
      const driftCount = Math.floor(target * 0.16); // deriva rada ai bordi
      particles = [];

      // Il volto occupa un quadrato centrato, ~92% del lato corto.
      const side = Math.min(W, H) * 0.92;
      const ox = (W - side) / 2;
      const oy = (H - side) / 2;

      let guard = 0;
      while (particles.length < target && guard++ < target * 40) {
        const nx = rng(), ny = rng();
        if (!inside(nx, ny)) continue;
        particles.push({
          x: ox + nx * side,
          y: oy + ny * side,
          size: 1.2 + rng() * 2.2,
          shape: Math.floor(rng() * 4) as Particle["shape"],
          color: pickColor(rng),
          amp: 1.5 + rng() * 2.5,
          speed: 0.3 + rng() * 0.7,
          phase: rng() * Math.PI * 2,
        });
      }
      // Deriva sparsa fuori dalla sagoma (il campo respira oltre il volto)
      for (let i = 0; i < driftCount; i++) {
        particles.push({
          x: rng() * W,
          y: rng() * H,
          size: 0.8 + rng() * 1.6,
          shape: Math.floor(rng() * 4) as Particle["shape"],
          color: `rgba(255,255,255,${0.08 + rng() * 0.2})`,
          amp: 3 + rng() * 5,
          speed: 0.15 + rng() * 0.35,
          phase: rng() * Math.PI * 2,
        });
      }
    }

    function drawShape(p: Particle, x: number, y: number) {
      if (!ctx) return;
      ctx.fillStyle = p.color;
      const s = p.size;
      switch (p.shape) {
        case 0:
          ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2); ctx.fill(); break;
        case 1:
          ctx.beginPath(); ctx.moveTo(x, y - s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.lineTo(x - s / 2, y + s / 2); ctx.closePath(); ctx.fill(); break;
        case 2:
          ctx.beginPath(); ctx.moveTo(x, y - s / 2); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y + s / 2); ctx.lineTo(x - s / 2, y); ctx.closePath(); ctx.fill(); break;
        default:
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }

    function frame(tMs: number) {
      if (!ctx) return;
      const t = tMs / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const dx = Math.sin(t * p.speed + p.phase) * p.amp;
        const dy = Math.cos(t * p.speed * 0.8 + p.phase) * p.amp * 0.7;
        drawShape(p, p.x + dx, p.y + dy);
      }
      raf = requestAnimationFrame(frame);
    }

    build();
    if (reduce) {
      // Statico: un solo disegno, niente loop.
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) drawShape(p, p.x, p.y);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      build();
      if (reduce && ctx) {
        ctx.clearRect(0, 0, W, H);
        for (const p of particles) drawShape(p, p.x, p.y);
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
