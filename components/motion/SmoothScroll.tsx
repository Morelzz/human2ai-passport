"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Smooth scroll globale (Lenis): dà al sito la scorrevolezza "premium" e abilita
// gli effetti legati allo scroll (parallasse). Headless: si monta una volta nel
// layout e non rende nulla. Disattivato per chi preferisce meno movimento.
//
// PONTE GSAP: ScrollTrigger viene tenuto in sincrono con Lenis (lenis.on scroll
// -> ScrollTrigger.update) così le sezioni pinnate/scrub (es. "Come funziona")
// leggono la posizione giusta anche con lo scroll ammorbidito.
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    // anchors: i link interni (#come-funziona) scrollano via Lenis, dato che il
    // CSS scroll-behavior:smooth è stato rimosso (era in conflitto con Lenis).
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
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
