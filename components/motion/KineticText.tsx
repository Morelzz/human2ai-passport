"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const GRAD = "linear-gradient(90deg,#6B21E8,#B8005C,#00A896,#6B21E8)";

const charV: Variants = {
  hidden: { opacity: 0, y: "0.55em", filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE } },
};

// Testo cinetico: rivela il testo LETTERA per lettera (rise + blur) allo scroll.
// Variante `gradient`: gradiente brand animato.
//
// ⚠️ ARCHITETTURA (bug imparato): mai mettere sullo stesso motion-element sia
// l'orchestrazione variants (whileInView/hidden→show) sia un `animate` object —
// il secondo SOPPRIME la prima e i figli restano invisibili (opacity 0).
// Quindi: il gradiente vive su uno span INTERNO con solo `animate` infinito,
// il reveal vive su uno span ESTERNO con solo variants. Niente lettere annidate
// nel gradiente (background-clip:text + figli trasformati = pittura rotta).
export function KineticText({
  text,
  className,
  delay = 0,
  gradient = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  gradient?: boolean;
}) {
  const reduce = useReducedMotion();

  // ── Variante GRADIENTE: blocco unico (no per-lettera), robusta al 100% ────
  if (gradient) {
    const inner = (
      <motion.span
        className={`${className ?? ""} inline-block bg-[length:200%_auto] bg-clip-text text-transparent`}
        style={{ backgroundImage: GRAD }}
        animate={reduce ? undefined : { backgroundPosition: ["0% center", "200% center"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        {text}
      </motion.span>
    );
    if (reduce) return inner;
    return (
      <motion.span
        className="inline-block"
        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.7, delay, ease: EASE }}
      >
        {inner}
      </motion.span>
    );
  }

  // ── Variante normale: lettera per lettera ─────────────────────────────────
  if (reduce) return <span className={className}>{text}</span>;

  // filter(Boolean): spazi ai bordi o doppi producevano "parole" vuote → span
  // vuoti e buchi nel testo. La spaziatura tra segmenti si gestisce FUORI dal
  // componente (con {" "} nel JSX), mai dentro `text`.
  const words = text.split(" ").filter(Boolean);

  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: delay } } }}
    >
      {words.map((word, wi) => (
        <motion.span
          key={wi}
          aria-hidden
          className="inline-block whitespace-nowrap"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
        >
          {Array.from(word).map((ch, ci) => (
            <motion.span key={ci} className="inline-block" variants={charV}>{ch}</motion.span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </motion.span>
      ))}
    </motion.span>
  );
}
