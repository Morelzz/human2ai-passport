"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Testo col gradiente tramonto (amber <-> coral) ANIMATO che scorre. Reso con
// framer-motion (anima background-position) per NON dipendere da classi CSS
// globali, che in dev a volte non si ricompilano. inline (default di motion.span)
// cosi' l'accento va a capo come testo normale, senza overflow. Reduced-motion
// -> gradiente fermo (ma presente). Usato sui titoli forti della home.
const FLOW_BG = "linear-gradient(110deg,#F2A93B,#EE7A70,#F2A93B)";

export function GradientFlowText({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={className}
      style={{
        backgroundImage: FLOW_BG,
        backgroundSize: "200% auto",
        backgroundPosition: "0% center",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      }}
      animate={reduce ? undefined : { backgroundPosition: ["0% center", "-200% center"] }}
      transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}
