"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";

import { HERO_POSTER as POSTER, HERO_VIDEO as VIDEO } from "@/lib/hero-media";

// Riquadro video dell'hero: autoplay muto in loop (regole mobile rispettate:
// muted + playsInline). Sul punto di loop una piccola transizione "dip-to-dark"
// ammorbidisce lo stacco. Sotto prefers-reduced-motion resta il poster, fermo.
export function HeroVideo({ className = "" }: { className?: string }) {
  // Il poster e' l'LCP: il <link rel=preload> lo scrive il SERVER in
  // app/page.tsx, in cima all'<head>. Qui NON si richiama preload() di
  // react-dom: due sorgenti per lo stesso file si annullavano a vicenda e il
  // preload spariva dall'HTML (21/9/2026).
  const reduce = useReducedMotionSafe();
  const seamRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSrc(VIDEO);
  }, []);

  // La src arriva DOPO il mount: l'attributo autoplay da solo puo' non
  // riscattare, quindi play() esplicito (best-effort, il poster resta il fallback).
  useEffect(() => {
    if (src) videoRef.current?.play().catch(() => {});
  }, [src]);

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    const d = v.duration;
    if (!d || !seamRef.current) return;
    const FADE = 0.5; // secondi di transizione attorno al loop
    let op = 0;
    if (v.currentTime > d - FADE) op = (v.currentTime - (d - FADE)) / FADE;
    else if (v.currentTime < FADE) op = 1 - v.currentTime / FADE;
    seamRef.current.style.opacity = String(Math.max(0, Math.min(1, op)) * 0.8);
  }

  return (
    <div className={`relative aspect-square overflow-hidden rounded-[24px] bg-[#0C0F17] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] ${className}`} aria-hidden>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={src ?? undefined}
        poster={POSTER}
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={reduce ? undefined : onTimeUpdate}
        // idempotente: se un blip (visibilita'/load) ha interrotto l'autoplay,
        // al canplay si riparte; play() su un video gia' in corso e' un no-op.
        onCanPlay={reduce ? undefined : () => videoRef.current?.play().catch(() => {})}
      />
      {/* Overlay del "dip-to-dark" sul loop (opacita' guidata da onTimeUpdate). */}
      <div ref={seamRef} className="pointer-events-none absolute inset-0 bg-[#0C0F17]" style={{ opacity: 0 }} />
    </div>
  );
}
