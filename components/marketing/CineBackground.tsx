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
          {/* Sfocatura ridotta (64–72px), dimensioni cappate e movimento contenuto:
              l'aurora resta viva ma costa molta meno GPU (lo sfocato grande che si
              sposta tanto era la causa principale del lag in locale). */}
          <motion.div
            className="absolute -left-[12%] -top-[18%] h-[min(52vw,620px)] w-[min(52vw,620px)] rounded-full blur-[64px]"
            style={{ background: "radial-gradient(circle, rgba(242,169,59,0.22), transparent 65%)" }}
            animate={{ x: [0, 32, -12, 0], y: [0, 22, 40, 0], scale: [1, 1.07, 0.98, 1] }}
            transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-[14%] top-[30%] h-[min(46vw,560px)] w-[min(46vw,560px)] rounded-full blur-[64px]"
            style={{ background: "radial-gradient(circle, rgba(184,0,92,0.16), transparent 65%)" }}
            animate={{ x: [0, -26, 12, 0], y: [0, 26, -14, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 48, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-[18%] left-[30%] h-[min(50vw,600px)] w-[min(50vw,600px)] rounded-full blur-[72px]"
            style={{ background: "radial-gradient(circle, rgba(0,168,150,0.14), transparent 65%)" }}
            animate={{ x: [0, 22, -22, 0], y: [0, -18, 12, 0], scale: [1, 1.05, 0.98, 1] }}
            transition={{ duration: 54, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Campo di profondità a punti (griglia rada mascherata) — dà spazialità. */}
      <div className="cine-stars" aria-hidden />

      {/* Vignettatura: bordi più scuri, inquadratura cinematografica. */}
      <div className="cine-vignette" aria-hidden />

      {/* Grana cinematografica finissima. */}
      <div className="grain" aria-hidden />
    </>
  );
}
