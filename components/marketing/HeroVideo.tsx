"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";

// Sorgente su Supabase Storage pubblico (CDN) — niente peso nel repo git.
const SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/hero.mp4`;

// Video di sfondo dell'hero: autoplay muto in loop (regole mobile rispettate:
// muted + playsInline). Sul punto di loop facciamo una piccola transizione
// "dip-to-dark" (lo schermo respira verso lo scuro e torna) per ammorbidire lo
// stacco del loop. Sotto prefers-reduced-motion: nessun autoplay né movimento.
export function HeroVideo({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const seamRef = useRef<HTMLDivElement>(null);

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
        className="h-full w-full object-cover"
        src={SRC}
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={reduce ? undefined : onTimeUpdate}
      />
      {/* Overlay del "dip-to-dark" sul loop (opacità guidata da onTimeUpdate). */}
      <div ref={seamRef} className="pointer-events-none absolute inset-0 bg-obsidian" style={{ opacity: 0 }} />
    </div>
  );
}
