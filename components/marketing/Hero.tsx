"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/Magnetic";
import { HeroVideo } from "./HeroVideo";

// HERO — video di brand a tutto schermo + tipografia "Dala": display peso 200
// a dimensione estrema, tracking -0.04em ("inciso nella luce"), CTA a pillola.
// Scrim multi-livello per la leggibilità del testo sul video.

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};
// Cinematica LINEARE (scelta di Morelz): il titolo si solleva RIGA PER RIGA con
// uno stagger interno calmo; sotto, una hairline elegante che sfuma in dolce.
const titleLines = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
};
const titleLine = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};
const rule = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count, blockedMonth, protectedFaces }: { count: number; blockedMonth: number; protectedFaces: number }) {
  return (
    <section data-theme="dark" className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Sfondo: obsidian di base + video a tutto schermo (object-cover). Il video
          e' VERTICALE: su desktop si croppa ai lati, su mobile riempie. */}
      <div aria-hidden className="absolute inset-0 z-0 bg-obsidian" />
      <HeroVideo className="absolute inset-0 z-0" />

      {/* Scrim per la leggibilità del testo sul video */}
      <div aria-hidden className="absolute inset-0 z-[1] bg-black/45" />
      <div aria-hidden className="absolute inset-0 z-[1] hidden bg-gradient-to-r from-black via-black/70 to-transparent sm:block" />
      <div aria-hidden className="absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-obsidian to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-obsidian to-transparent" />

      {/* Contenuto */}
      <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl text-center sm:text-left">
          <motion.span variants={item} className="label-mono inline-flex text-violet-light">
            Il filtro di tutela umana
          </motion.span>

          <motion.h1
            variants={titleLines}
            className="mt-6 text-balance text-[3.2rem] font-extralight leading-[0.97] tracking-[-0.04em] sm:text-[4.4rem] lg:text-[5rem]"
          >
            <motion.span variants={titleLine} className="block">Real Humans.</motion.span>
            <motion.span variants={titleLine} className="block">Real Rights.</motion.span>
            <motion.span variants={titleLine} className="block">Real <ShimmerWord>Earnings</ShimmerWord>.</motion.span>
          </motion.h1>

          {/* Hairline tramonto: la "firma" della cinematica lineare, sotto il titolo */}
          <motion.div
            variants={rule}
            aria-hidden
            className="mx-auto mt-7 h-px w-full max-w-[260px] sm:mx-0"
            style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.55), var(--hairline) 42%, transparent 85%)" }}
          />

          <motion.p variants={item} className="mx-auto mt-7 max-w-md text-[0.98rem] leading-relaxed tracking-[0.025em] text-[rgba(242,233,216,0.70)] sm:mx-0">
            Nessuna AI genera un essere umano senza il permesso di una persona reale:{" "}
            <span className="text-foreground">riconosciuta, protetta e pagata</span>, ogni volta.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Magnetic><Button asChild size="lg"><Link href="/match">Esplora il registro</Link></Button></Magnetic>
            <Magnetic><Button asChild size="lg" variant="secondary"><Link href="#come-funziona">Come funziona</Link></Button></Magnetic>
          </motion.div>

          <motion.p variants={item} className="mt-8 text-xs tracking-[0.05em] text-[rgba(242,233,216,0.70)]">
            {count} volti già nel registro · ogni token è verificabile pubblicamente
          </motion.p>

          {/* Review C3 — il contatore manifesto: stessa fonte di /trasparenza */}
          <motion.p variants={item} className="mt-2 text-xs tracking-[0.05em] text-[rgba(242,233,216,0.70)]">
            <span className="font-mono font-bold text-crimson-light">{blockedMonth}</span>{" "}
            {blockedMonth === 1 ? "generazione rifiutata" : "generazioni rifiutate"} questo mese,{" "}
            <span className="text-foreground">e questo è il punto.</span>
          </motion.p>

          {/* Fase 4.1 sul fronte home — il SECONDO numero manifesto: i volti
              registrati per non essere mai generati (VETO). Stessa fonte di
              /trasparenza. Regge a 0 (pre-campagna): la punchline è il diritto. */}
          <motion.p variants={item} className="mt-1 text-xs tracking-[0.05em] text-[rgba(242,233,216,0.70)]">
            <span className="font-mono font-bold text-violet-light">{protectedFaces}</span>{" "}
            {protectedFaces === 1 ? "volto protetto" : "volti protetti"} dall&apos;IA, perché{" "}
            <span className="text-foreground">dire no è un diritto.</span>
          </motion.p>
        </motion.div>
      </div>

      {/* Indicatore di scroll */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-1/2 z-[2] -translate-x-1/2 text-[rgba(242,233,216,0.70)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.4], y: [0, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}

// Il payoff ambra: l'unico momento a gradiente dell'hero. Statico sotto
// reduced-motion.
function ShimmerWord({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="bg-[length:200%_auto] bg-clip-text font-light text-transparent"
      style={{ backgroundImage: "linear-gradient(90deg,#E5B57A,#F2A93B,#E5B57A)" }}
      animate={reduce ? undefined : { backgroundPosition: ["0% center", "200% center"] }}
      transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}
