"use client";

import { useEffect, useRef, useState } from "react";

// Un importo in euro che conta da zero al valore vero quando entra nello
// schermo (27/9/2026). Il server scrive gia' il valore finale: senza
// JavaScript, o con "riduci animazioni", si vede il numero giusto e basta.
const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export function ContaEuro({ cent, durata = 1100 }: { cent: number; durata?: number }) {
  const [valore, setValore] = useState(cent);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Solo se non e' gia' sullo schermo: niente numero che torna a zero sotto gli occhi.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setValore(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const passo = (t: number) => {
        const k = Math.min(1, (t - t0) / durata);
        const facile = 1 - Math.pow(1 - k, 3); // ease-out
        setValore(Math.round(cent * facile));
        if (k < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [cent, durata]);

  return <span ref={ref} className="tabular-nums">{euro(valore)}</span>;
}
