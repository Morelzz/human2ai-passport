"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count }: { count: number }) {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Testo / manifesto */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet/25 bg-violet/10 px-3.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-violet" />
            <span className="text-[0.68rem] font-bold tracking-[0.16em] text-violet-light">IL FILTRO DI TUTELA UMANA</span>
          </motion.div>

          <motion.h1 variants={item} className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.75rem]">
            Presto, generare un volto <span className="text-crimson">senza consenso</span> sarà <span className="text-gradient">impossibile</span>.
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Noi siamo il filtro tra ogni intelligenza artificiale e ogni volto umano.
            Ogni identità ha un consenso <span className="text-foreground">verificabile</span>.
            Ogni generazione <span className="text-foreground">paga la persona reale</span>.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/match">Esplora il registro</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#come-funziona">Come funziona</Link></Button>
          </motion.div>

          <motion.p variants={item} className="mt-7 text-sm text-faint">
            {count} volti già nel registro · ogni token è verificabile pubblicamente
          </motion.p>
        </motion.div>

        {/* Ritratto verificato */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          className="relative mx-auto w-full max-w-sm"
        >
          {/* Alone dietro la card */}
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(107,33,232,0.35),transparent_70%)] blur-2xl" />
          <PortraitCard />
        </motion.div>
      </div>
    </section>
  );
}

function PortraitCard() {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-obsidian-2 shadow-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/api/sample/mario-r/0" alt="Volto reale verificato nel registro Human2AI" className="h-full w-full object-cover" />

      {/* Velatura per leggibilità degli overlay */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82),transparent_45%,rgba(0,0,0,0.25))]" />

      {/* Brackets da mirino agli angoli */}
      <div aria-hidden className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-teal/70" />
      <div aria-hidden className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-teal/70" />
      <div aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-teal/70" />
      <div aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-teal/70" />

      {/* Chip VERIFICATO (in alto a sx) */}
      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-black/50 px-3 py-1.5 backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
        </span>
        <span className="text-[0.7rem] font-bold tracking-wide text-teal">VERIFICATO</span>
      </div>

      {/* Scan line cinematografica */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 h-px bg-[linear-gradient(to_right,transparent,#00A896,transparent)]"
        initial={{ top: "8%" }}
        animate={{ top: ["8%", "92%", "8%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Barra info in basso */}
      <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Mario R.</p>
            <p className="text-xs text-white/60">@mario-r · token verificabile</p>
          </div>
          <span className="rounded-full border border-violet/40 bg-violet/15 px-2.5 py-1 text-[0.65rem] font-bold text-violet-light">SOUL</span>
        </div>
      </div>
    </div>
  );
}
