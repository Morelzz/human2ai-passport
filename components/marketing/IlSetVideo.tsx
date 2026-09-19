"use client";

import { useEffect, useRef } from "react";

// Video della scheda Anima nella home: muto, in loop, parte solo quando e' sullo
// schermo e si ferma quando esce (niente banda e batteria sprecate piu' in
// basso nella pagina). Con "riduci movimento" resta il poster, fermo.
export function IlSetVideo({ src, poster, className = "" }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = src;
          v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-hidden className={className} />;
}
