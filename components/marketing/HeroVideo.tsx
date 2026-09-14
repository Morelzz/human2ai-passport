"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Sorgenti su Supabase Storage pubblico (CDN), niente peso nel repo git.
// Casa nuova (2026-09-14): il video dell'hero e' QUADRATO (generato con
// Seedance 2.5, 720p): un solo file che sta bene sia nel riquadro desktop sia
// sopra il titolo sul telefono. Poster del primo frame per LCP istantaneo.
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;
const POSTER = `${BASE}/hero-v3-poster.jpg`;
const VIDEO = `${BASE}/hero-v3.mp4`; // 1:1, muto, ottimizzato

// Riquadro video dell'hero: autoplay muto in loop (regole mobile rispettate:
// muted + playsInline). Sul punto di loop una piccola transizione "dip-to-dark"
// ammorbidisce lo stacco. Sotto prefers-reduced-motion resta il poster, fermo.
export function HeroVideo({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
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
