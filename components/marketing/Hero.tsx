"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/Magnetic";
import { HeroVideo } from "./HeroVideo";

// HERO — video di brand a tutto schermo (scelta di Morelz) + tipografia
// "Dala": display peso 200 a dimensione estrema, tracking -0.04em ("inciso
// nella luce"), CTA a pillola. Scrim multi-livello per la leggibilità.

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count }: { count: number }) {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Video di sfondo a tutto schermo (loop con dip-to-dark) */}
      <HeroVideo className="absolute inset-0 z-0" />

      {/* Scrim per leggibilità del testo */}
      <div aria-hidden className="absolute inset-0 z-[1] bg-black/45" />
      <div aria-hidden className="absolute inset-0 z-[1] hidden bg-gradient-to-r from-black via-black/70 to-transparent sm:block" />
      <div aria-hidden className="absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-black to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-black to-transparent" />

      {/* Contenuto */}
      <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl text-center sm:text-left">
          <motion.span variants={item} className="label-mono inline-flex text-violet-light">
            Il filtro di tutela umana
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 text-balance text-[3.2rem] font-extralight leading-[0.97] tracking-[-0.04em] sm:text-[4.4rem] lg:text-[5rem]"
          >
            Dietro ogni volto,
            <br />
            una <ShimmerWord>persona vera</ShimmerWord>.
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-7 max-w-md text-[0.98rem] leading-relaxed tracking-[0.025em] text-[#bdbdbd] sm:mx-0">
            Il filtro che impedisce all&apos;AI di generare un essere umano senza il permesso
            di una persona reale — <span className="text-foreground">riconosciuta, protetta e pagata</span>, ogni volta.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Magnetic><Button asChild size="lg"><Link href="/match">Esplora il registro</Link></Button></Magnetic>
            <Magnetic><Button asChild size="lg" variant="secondary"><Link href="#come-funziona">Come funziona</Link></Button></Magnetic>
          </motion.div>

          <motion.p variants={item} className="mt-8 text-xs tracking-[0.05em] text-[#9a9a9a]">
            {count} volti già nel registro · ogni token è verificabile pubblicamente
          </motion.p>
        </motion.div>
      </div>

      {/* Indicatore di scroll */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-1/2 z-[2] -translate-x-1/2 text-[#9a9a9a]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.4], y: [0, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}

// Il payoff tricolore: l'unico momento a gradiente dell'hero. Statico sotto
// reduced-motion.
function ShimmerWord({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="bg-[length:200%_auto] bg-clip-text font-light text-transparent"
      style={{ backgroundImage: "linear-gradient(90deg,#8b47f0,#e0006f,#00d4be,#8b47f0)" }}
      animate={reduce ? undefined : { backgroundPosition: ["0% center", "200% center"] }}
      transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}
