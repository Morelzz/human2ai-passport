"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

// [FRASE D'IMPATTO] — una riga forte tra l'Hero e "Come funziona". La chiusura
// "Noi proteggiamo, e paghiamo, quelle vere." ha il gradiente tramonto
// (amber <-> coral) ANIMATO: scorre in loop. Reso con framer-motion (anima
// background-position), quindi NON dipende da classi CSS globali (che in dev a
// volte non si ricompilano). Reduced-motion -> gradiente statico, fermo.
// Regola copy: niente trattini lunghi.

// Gradiente periodico (amber ai due estremi) per un loop senza scatti.
const FLOW_BG = "linear-gradient(110deg,#F2A93B,#EE7A70,#F2A93B)";

export function Impact() {
  const reduce = useReducedMotion();

  const gradient: CSSProperties = {
    backgroundImage: FLOW_BG,
    backgroundSize: "200% auto",
    backgroundPosition: "0% center",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };

  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
      <p className="text-balance text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
        L&apos;AI ha imparato a fabbricare persone.{" "}
        <motion.span
          style={gradient}
          animate={reduce ? undefined : { backgroundPosition: ["0% center", "-200% center"] }}
          transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: "linear" }}
        >
          Noi proteggiamo, e paghiamo, quelle vere.
        </motion.span>
      </p>
    </section>
  );
}
