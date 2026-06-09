"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

// Barra di avanzamento dello scroll: filo a gradiente brand fissato in cima alla
// pagina che si "riempie" mentre scorri. Dettaglio HUD globale, costo zero.
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
      // Dala: niente glow né gradiente — un filo viola pieno, e basta.
      style={{ scaleX, background: "#8b47f0" }}
    />
  );
}
