"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Smooth scroll globale (Lenis): dà al sito la scorrevolezza "premium" e abilita
// gli effetti legati allo scroll (parallasse). Headless: si monta una volta nel
// layout e non rende nulla. Disattivato per chi preferisce meno movimento.
//
// Niente piu' ponte GSAP (17/9/2026): l'unica sezione pinnata (Come funziona)
// usa ora le animazioni legate allo scroll del browser, e GSAP non viaggia piu'
// in ogni pagina.
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // anchors: i link interni (#come-funziona) scrollano via Lenis, dato che il
    // CSS scroll-behavior:smooth è stato rimosso (era in conflitto con Lenis).
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: true });
    // Istanza esposta per gli scroll programmatici (Lenis sovrascrive i
    // window.scrollTo nativi: chi vuole scrollare via codice passa da qui).
    (window as Window & { __lenis?: Lenis }).__lenis = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      delete (window as Window & { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
