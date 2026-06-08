"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Parallax } from "@/components/motion/Parallax";
import { Magnetic } from "@/components/motion/Magnetic";
import { KineticText } from "@/components/motion/KineticText";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count }: { count: number }) {
  return (
    <section className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Logo animato con parallasse allo scroll */}
        <Parallax speed={0.35} className="order-1 mx-auto w-full max-w-[15rem] sm:max-w-xs lg:order-2 lg:max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <LogoMark />
          </motion.div>
        </Parallax>

        {/* Testo / manifesto */}
        <motion.div variants={container} initial="hidden" animate="show" className="order-2 text-center lg:order-1 lg:text-left">
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet/25 bg-violet/10 px-3.5 py-1.5 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-violet" />
            <span className="text-[0.68rem] font-bold tracking-[0.16em] text-violet-light">IL FILTRO DI TUTELA UMANA</span>
          </motion.div>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.9rem]">
            <span className="block"><KineticText text="Dietro ogni volto," /></span>
            <span className="block">
              <KineticText text="una " delay={0.18} />
              <ShimmerWord>persona vera</ShimmerWord>.
            </span>
          </h1>

          <motion.p variants={item} className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg lg:mx-0">
            HUMAN2AI è il filtro che impedisce a un&apos;intelligenza artificiale di creare un essere
            umano senza il permesso di un essere umano reale — <span className="text-foreground">riconosciuto,
            protetto e pagato</span> ogni volta.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
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
        className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-faint"
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

// Centerpiece: il logo-scudo Human2AI animato (alone che respira + anello
// conico in rotazione + fluttuazione). Tutto basato sui colori del logo.
function LogoMark() {
  return (
    <div className="relative mx-auto flex aspect-square w-full items-center justify-center">
      {/* Alone che respira */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle at 50% 45%, rgba(107,33,232,0.45), rgba(0,168,150,0.16) 45%, transparent 70%)" }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [0.95, 1.06, 0.95] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Anello conico in rotazione lenta */}
      <motion.div
        aria-hidden
        className="absolute inset-[12%] rounded-full opacity-25 blur-md"
        style={{ background: "conic-gradient(from 0deg, transparent, rgba(0,168,150,0.55), transparent 28%, rgba(184,0,92,0.55), transparent 58%, rgba(107,33,232,0.6), transparent)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />

      {/* Il logo, in lieve fluttuazione */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-[82%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-shield.png"
          alt="Human2AI — lo scudo che tutela il volto umano nell'IA"
          className="w-full [mask-image:radial-gradient(circle_at_50%_46%,#000_50%,transparent_74%)] [-webkit-mask-image:radial-gradient(circle_at_50%_46%,#000_50%,transparent_74%)] drop-shadow-[0_0_45px_rgba(107,33,232,0.4)]"
        />
      </motion.div>
    </div>
  );
}
