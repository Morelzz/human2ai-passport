"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count }: { count: number }) {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-24">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Logo animato — crest in alto su mobile, a destra su desktop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 mx-auto w-full max-w-[15rem] sm:max-w-xs lg:order-2 lg:max-w-md"
        >
          <LogoMark />
        </motion.div>

        {/* Testo / manifesto */}
        <motion.div variants={container} initial="hidden" animate="show" className="order-2 text-center lg:order-1 lg:text-left">
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet/25 bg-violet/10 px-3.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-violet" />
            <span className="text-[0.68rem] font-bold tracking-[0.16em] text-violet-light">IL FILTRO DI TUTELA UMANA</span>
          </motion.div>

          <motion.h1 variants={item} className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.75rem]">
            Presto, generare un volto <span className="text-crimson">senza consenso</span> sarà <span className="text-gradient">impossibile</span>.
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg lg:mx-0">
            Noi siamo il filtro tra ogni intelligenza artificiale e ogni volto umano.
            Ogni identità ha un consenso <span className="text-foreground">verificabile</span>.
            Ogni generazione <span className="text-foreground">paga la persona reale</span>.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button asChild size="lg"><Link href="/match">Esplora il registro</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#come-funziona">Come funziona</Link></Button>
          </motion.div>

          <motion.p variants={item} className="mt-7 text-sm text-faint">
            {count} volti già nel registro · ogni token è verificabile pubblicamente
          </motion.p>
        </motion.div>
      </div>
    </section>
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
