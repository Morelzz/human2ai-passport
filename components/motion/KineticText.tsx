"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const charV: Variants = {
  hidden: { opacity: 0, y: "0.55em", filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE } },
};

// Testo cinetico: rivela il testo LETTERA per lettera (rise + blur che si risolve)
// allo scroll/ingresso. Le parole non si spezzano (ogni parola è inline-block).
// Statico sotto reduced-motion. `gradient` applica il gradiente brand animato.
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
  const gradCls = gradient ? "bg-[length:200%_auto] bg-clip-text text-transparent" : "";
  const gradStyle = gradient
    ? { backgroundImage: "linear-gradient(90deg,#6B21E8,#B8005C,#00A896,#6B21E8)" }
    : undefined;

  if (reduce) {
    return (
      <span className={`${className ?? ""} ${gradCls}`} style={gradStyle}>{text}</span>
    );
  }

  // filter(Boolean): spazi ai bordi o doppi producevano "parole" vuote → span
  // vuoti e buchi visibili nel testo. La spaziatura tra segmenti si gestisce
  // FUORI dal componente (con {" "} nel JSX), mai dentro `text`.
  const words = text.split(" ").filter(Boolean);
  return (
    <motion.span
      className={`${className ?? ""} ${gradCls}`}
      style={gradStyle}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: delay } } }}
      {...(gradient ? { animate: { backgroundPosition: ["0% center", "200% center"] }, transition: { duration: 7, repeat: Infinity, ease: "linear" } } : {})}
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
