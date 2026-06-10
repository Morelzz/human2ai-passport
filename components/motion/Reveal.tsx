"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Reveal allo scroll: il blocco entra in scena (fade + slide + sfocatura che si
// risolve) quando entra nel viewport. Una volta sola. Sotto reduced-motion resta
// statico. È il mattone base delle sezioni cinematiche della home.
//
// Review B2: il reveal deve essere LEGGERO e ANTICIPATO — a scroll veloce il
// contenuto non può restare nero. Margine positivo in basso = parte PRIMA che
// la sezione entri nel viewport; durata corta; poco slide/blur.
export function Reveal({
  children,
  className,
  y = 16,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px 18% 0px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Variants per liste con stagger: usa <RevealStagger> sul contenitore e
// `revealItem` sui figli (motion.*) per un'entrata sfalsata.
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function RevealStagger({ children, className, gap = 0.07 }: { children: ReactNode; className?: string; gap?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px 18% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}
