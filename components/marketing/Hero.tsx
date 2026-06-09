"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/Magnetic";
import { FaceConstellation } from "./FaceConstellation";

// HERO — sistema "Dala ibrido" (docs/DESIGN.md): split 50/50 sul void.
// Sinistra: blocco testo stretto (eyebrow → display sottile → body → CTA).
// Destra: la costellazione-volto, che possiede la scena (il testo è ospite).
// Titolo peso 200 a dimensione estrema con tracking negativo: "inciso nella
// luce, non stampato". Niente ombre, niente vetro: profondità dal vuoto.

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
    <section className="relative mx-auto flex min-h-[92vh] max-w-6xl items-center px-5 sm:px-8">
      <div className="grid w-full items-center gap-10 py-16 lg:grid-cols-2 lg:gap-6">
        {/* Costellazione-volto — su mobile sopra, su desktop a destra */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="order-1 lg:order-2"
        >
          <FaceConstellation className="mx-auto h-[44vh] w-full max-w-[30rem] lg:h-[72vh] lg:max-w-none" />
        </motion.div>

        {/* Blocco testo — stretto, il void respira intorno */}
        <motion.div variants={container} initial="hidden" animate="show" className="order-2 max-w-[30rem] text-center lg:order-1 lg:text-left">
          <motion.span variants={item} className="label-mono text-violet-light">
            Il filtro di tutela umana
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 text-balance text-[3.4rem] font-extralight leading-[0.95] tracking-[-0.04em] sm:text-[4.6rem] lg:text-[5.2rem]"
          >
            Dietro ogni volto,
            <br />
            una <ShimmerWord>persona vera</ShimmerWord>.
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-7 max-w-md text-[0.98rem] leading-relaxed tracking-[0.025em] text-[#bdbdbd] lg:mx-0">
            Il filtro che impedisce all&apos;AI di generare un essere umano senza il permesso
            di una persona reale — <span className="text-foreground">riconosciuta, protetta e pagata</span>, ogni volta.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
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
        className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[#9a9a9a]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.4], y: [0, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}

// Il payoff tricolore: l'unico momento a gradiente dell'hero (ibrido fedele —
// la firma brand sopravvive solo dove conta). Statico sotto reduced-motion.
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
