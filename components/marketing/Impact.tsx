"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

// [FRASE D'IMPATTO] — sezione CONFINATA in stile "spotlight": un pannello scuro
// tutto suo, un cono di luce che respira, la tesi che emerge dal buio e la promessa
// in Amber attraversata da un riflesso di luce (shine) che passa in loop. Reso con
// framer-motion (anima background-position e l'alone), quindi NON dipende da classi
// CSS globali (che in dev a volte non si ricompilano). Reduced-motion -> tutto
// fermo. Regola copy: niente trattini lunghi.

// Gradiente del riflesso: amber pieno con una banda chiara che lo attraversa.
const SHINE = "linear-gradient(100deg,#F2A93B 0%,#F2A93B 40%,#FFF1D6 50%,#F2A93B 60%,#F2A93B 100%)";

export function Impact() {
  const reduce = useReducedMotion();

  const shine: CSSProperties = {
    backgroundImage: SHINE,
    backgroundSize: "300% auto",
    backgroundPosition: "160% center",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <div
        className="relative isolate overflow-hidden rounded-[28px] border border-border px-6 py-24 text-center shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)] sm:px-10 sm:py-32"
        style={{ background: "radial-gradient(120% 80% at 50% -8%, #11151e, #080a10 60%)" }}
      >
        {/* Cono di luce che respira */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-30%] -z-10 h-[120%] w-[120%] -translate-x-1/2"
          style={{ background: "radial-gradient(closest-side, rgba(242,169,59,0.20), transparent 70%)" }}
          animate={reduce ? undefined : { opacity: [0.7, 1, 0.7] }}
          transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Vignetta: concentra lo sguardo al centro */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(120% 100% at 50% 35%, transparent 45%, rgba(0,0,0,0.66) 100%)" }}
        />

        <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#F2A93B]/85">La tesi</span>

        {/* La tesi: sottile, emerge dal buio */}
        <h2 className="mx-auto mt-5 max-w-[19ch] text-balance text-3xl font-extralight leading-[1.12] tracking-tight text-foreground/60 sm:text-5xl">
          L&apos;AI ha imparato a fabbricare persone.
        </h2>

        {/* Divisore luminoso */}
        <div
          aria-hidden
          className="mx-auto my-8 h-px w-32 rounded-full bg-gradient-to-r from-transparent via-[#F2A93B]/70 to-transparent shadow-[0_0_16px_rgba(242,169,59,0.5)]"
        />

        {/* La promessa: Amber pieno, col riflesso che passa */}
        <motion.p
          className="mx-auto max-w-[20ch] text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
          style={shine}
          animate={reduce ? undefined : { backgroundPosition: ["160% center", "-60% center"] }}
          transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
        >
          Noi proteggiamo, e paghiamo, quelle vere.
        </motion.p>
      </div>
    </section>
  );
}
