"use client";

import { motion, useReducedMotion } from "framer-motion";

// Sfondo cinematografico condiviso, VIVO: bagliori di base + aurora in lento
// movimento + campo di profondità a punti + grana. Tutto sotto il contenuto.
// Va inserito come primo figlio di un wrapper `relative`; il contenuto va in un
// secondo figlio con `relative z-[2]`.
//
// Filosofia: profondità e respiro, non fuochi d'artificio. Movimento lentissimo
// (30–46s per ciclo) → cinematico ma leggero per batteria/CPU. Chi preferisce
// meno movimento (`prefers-reduced-motion`) vede solo lo strato statico.
export function CineBackground() {
  const reduce = useReducedMotion();

  return (
    <>
      {/* Strato statico di base: bagliori profondi (paint immediato, niente flash). */}
      <div className="cine-bg" aria-hidden />

      {/* Aurora in lento movimento — tre blob brand che derivano e respirano. */}
      {!reduce && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <motion.div
            className="absolute -left-[15%] -top-[20%] h-[55vw] w-[55vw] rounded-full blur-[110px]"
            style={{ background: "radial-gradient(circle, rgba(107,33,232,0.24), transparent 65%)" }}
            animate={{ x: [0, 70, -25, 0], y: [0, 45, 85, 0], scale: [1, 1.15, 0.95, 1] }}
            transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-[18%] top-[28%] h-[48vw] w-[48vw] rounded-full blur-[110px]"
            style={{ background: "radial-gradient(circle, rgba(184,0,92,0.18), transparent 65%)" }}
            animate={{ x: [0, -55, 25, 0], y: [0, 55, -30, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-[22%] left-[28%] h-[52vw] w-[52vw] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(0,168,150,0.15), transparent 65%)" }}
            animate={{ x: [0, 45, -45, 0], y: [0, -45, 25, 0], scale: [1, 1.08, 0.96, 1] }}
            transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Campo di profondità a punti (griglia rada mascherata) — dà spazialità. */}
      <div className="cine-stars" aria-hidden />

      {/* Grana cinematografica finissima. */}
      <div className="grain" aria-hidden />
    </>
  );
}
