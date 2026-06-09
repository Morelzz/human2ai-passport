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
      style={{
        scaleX,
        background: "linear-gradient(90deg,#6B21E8,#B8005C 55%,#00A896)",
        boxShadow: "0 0 12px rgba(107,33,232,0.55)",
      }}
    />
  );
}
