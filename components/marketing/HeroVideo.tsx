"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Sorgenti su Supabase Storage pubblico (CDN) — niente peso nel repo git.
// ONDATA MOBILE: l'originale (7,7MB) non si serve più. Poster del primo frame
// per LCP istantaneo + variante per viewport: 720p (~0,8MB) su mobile,
// 1080p (~2,2MB) su desktop. Scelta al mount, così si scarica UN solo file.
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;
const POSTER = `${BASE}/hero-poster.jpg`;

// Video di sfondo dell'hero: autoplay muto in loop (regole mobile rispettate:
// muted + playsInline). Sul punto di loop facciamo una piccola transizione
// "dip-to-dark" (lo schermo respira verso lo scuro e torna) per ammorbidire lo
// stacco del loop. Sotto prefers-reduced-motion: resta il poster, fermo.
export function HeroVideo({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const seamRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    // Con reduced-motion niente video: il poster è l'immagine dell'hero.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    setSrc(`${BASE}/hero-${mobile ? "720" : "1080"}.mp4`);
  }, []);

  // La src arriva DOPO il mount: l'attributo autoplay da solo può non
  // riscattare -> play() esplicito (best-effort, il poster resta il fallback).
  useEffect(() => {
    if (src) videoRef.current?.play().catch(() => {});
  }, [src]);

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    const d = v.duration;
    if (!d || !seamRef.current) return;
    const FADE = 0.6; // secondi di transizione attorno al loop
    let op = 0;
    if (v.currentTime > d - FADE) op = (v.currentTime - (d - FADE)) / FADE; // verso la fine: scurisce
    else if (v.currentTime < FADE) op = 1 - v.currentTime / FADE; // dopo il restart: rischiara
    seamRef.current.style.opacity = String(Math.max(0, Math.min(1, op)) * 0.7);
  }

  return (
    <div className={className} aria-hidden>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={src ?? undefined}
        poster={POSTER}
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={reduce ? undefined : onTimeUpdate}
        // idempotente: se un blip (visibilità/load) ha interrotto l'autoplay,
        // al canplay si riparte; play() su un video già in corso è un no-op.
        onCanPlay={reduce ? undefined : () => videoRef.current?.play().catch(() => {})}
      />
      {/* Overlay del "dip-to-dark" sul loop (opacità guidata da onTimeUpdate). */}
      <div ref={seamRef} className="pointer-events-none absolute inset-0 bg-obsidian" style={{ opacity: 0 }} />
    </div>
  );
}
