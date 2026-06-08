"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Parallasse legato allo scroll: il contenuto si muove a velocità diversa dallo
// scorrimento, creando profondità. `speed` positivo = si muove più lento (sfondo);
// valori piccoli (0.1–0.4) sono i più eleganti. Sotto reduced-motion è statico.
export function Parallax({
  children,
  className,
  speed = 0.25,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const range = speed * 80;
  const y = useTransform(scrollYProgress, [0, 1], [-range, range]);

  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
