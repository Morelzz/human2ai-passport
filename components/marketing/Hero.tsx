"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeroVideo } from "./HeroVideo";

// HERO, casa nuova (2026-09-14): un'ISOLA SCURA dentro la pagina chiara.
// A sinistra il manifesto (titolo pesante, sottotitolo, due azioni, tre numeri
// veri), a destra il video quadrato. Sul telefono il video sta SOPRA il titolo.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ count, paidCount, protectedFaces }: { count: number; paidCount: number; protectedFaces: number }) {
  return (
    <section className="mx-auto max-w-7xl px-3 pt-2 sm:px-6 lg:px-8">
      <div
        data-theme="dark"
        className="isola grid gap-7 px-5 pb-8 pt-5 sm:px-12 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:px-16 lg:py-16"
        style={{ background: "radial-gradient(70% 60% at 0% 0%, rgba(226,154,46,0.20), transparent 65%), #0C0F17" }}
      >
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col justify-center gap-5 sm:gap-6">
          <motion.span variants={item} className="kicker">Il filtro di tutela umana</motion.span>

          <motion.h1
            variants={item}
            className="text-balance text-[2.9rem] font-bold leading-[0.96] tracking-[-0.04em] sm:text-[4.4rem] lg:text-[5.1rem]"
          >
            Real Humans.<br />Real Rights.<br />Real <span className="text-amber">Earnings</span>.
          </motion.h1>

          {/* Hairline tramonto: la firma sotto il titolo */}
          <motion.div
            variants={item}
            aria-hidden
            className="h-px w-full max-w-[260px]"
            style={{ background: "linear-gradient(90deg, rgba(226,154,46,0.6), var(--hairline) 45%, transparent 90%)" }}
          />

          <motion.p variants={item} className="max-w-[44ch] text-pretty text-[1.05rem] leading-relaxed text-muted sm:text-[1.15rem]">
            Nessuna AI genera un essere umano senza il permesso di una persona reale:{" "}
            <span className="text-foreground">riconosciuta, protetta e pagata</span>, ogni volta.
          </motion.p>

          <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/catalogo">Esplora il registro</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#come-funziona">Come funziona</Link></Button>
          </motion.div>

          {/* I tre numeri veri, stessa fonte di /trasparenza */}
          <motion.dl variants={item} className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <dd className="font-mono text-[1.5rem] font-semibold tabular-nums sm:text-[1.7rem]">{count}</dd>
              <dt className="text-[0.75rem] leading-snug text-faint sm:text-[0.8rem]">volti nel registro</dt>
            </div>
            <div>
              <dd className="font-mono text-[1.5rem] font-semibold tabular-nums sm:text-[1.7rem]">{paidCount}</dd>
              <dt className="text-[0.75rem] leading-snug text-faint sm:text-[0.8rem]">generazioni pagate alle persone</dt>
            </div>
            <div>
              <dd className="font-mono text-[1.5rem] font-semibold tabular-nums text-amber sm:text-[1.7rem]">{protectedFaces}</dd>
              <dt className="text-[0.75rem] leading-snug text-faint sm:text-[0.8rem]">
                {protectedFaces === 1 ? "volto protetto, mai generabile" : "volti protetti, mai generabili"}
              </dt>
            </div>
          </motion.dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="order-first flex items-center justify-center lg:order-none"
        >
          <HeroVideo className="w-full max-w-[440px] lg:max-w-[470px]" />
        </motion.div>
      </div>
    </section>
  );
}
