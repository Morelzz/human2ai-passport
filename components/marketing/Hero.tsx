"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/Magnetic";
import { KineticText } from "@/components/motion/KineticText";
import { HeroVideo } from "./HeroVideo";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count }: { count: number }) {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Video di sfondo a tutto schermo */}
      <HeroVideo className="absolute inset-0 z-0" />

      {/* Scrim per leggibilità del testo (funziona su qualsiasi footage) */}
      <div aria-hidden className="absolute inset-0 z-[1] bg-obsidian/45" />
      <div aria-hidden className="absolute inset-0 z-[1] hidden bg-gradient-to-r from-obsidian via-obsidian/75 to-transparent sm:block" />
      <div aria-hidden className="absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-obsidian to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-obsidian to-transparent" />

      {/* Contenuto */}
      <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl text-center sm:text-left">
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1.5 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-violet" />
            <span className="text-[0.68rem] font-bold tracking-[0.16em] text-violet-light">IL FILTRO DI TUTELA UMANA</span>
          </motion.div>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)] sm:text-5xl lg:text-[3.9rem]">
            <span className="block"><KineticText text="Dietro ogni volto," /></span>
            <span className="block">
              <KineticText text="una " delay={0.18} />
              <ShimmerWord>persona vera</ShimmerWord>.
            </span>
          </h1>

          <motion.p variants={item} className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted drop-shadow-[0_1px_12px_rgba(0,0,0,0.7)] sm:text-lg sm:mx-0">
            HUMAN2AI è il filtro che impedisce a un&apos;intelligenza artificiale di creare un essere
            umano senza il permesso di un essere umano reale — <span className="text-foreground">riconosciuto,
            protetto e pagato</span> ogni volta.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Magnetic><Button asChild size="lg"><Link href="/match">Esplora il Registro Volti</Link></Button></Magnetic>
            <Magnetic><Button asChild size="lg" variant="secondary"><Link href="#come-funziona">Come funziona</Link></Button></Magnetic>
          </motion.div>

          <motion.p variants={item} className="mt-7 text-sm text-faint">
            {count} volti già nel registro · ogni token è verificabile pubblicamente
          </motion.p>
        </motion.div>
      </div>

      {/* Indicatore di scroll */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-1/2 z-[2] -translate-x-1/2 text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.4], y: [0, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}

// Parola col gradiente brand che scorre (kinetic). Statica sotto reduced-motion.
function ShimmerWord({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="bg-[length:200%_auto] bg-clip-text text-transparent"
      style={{ backgroundImage: "linear-gradient(90deg,#6B21E8,#B8005C,#00A896,#6B21E8)" }}
      animate={reduce ? undefined : { backgroundPosition: ["0% center", "200% center"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}
