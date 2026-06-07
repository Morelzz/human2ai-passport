"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Coins, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS = [
  { Icon: ShieldCheck, t: "Consenso verificato", d: "Decidi tu come e dove" },
  { Icon: Coins, t: "Pagato ogni volta", d: "Royalty a ogni utilizzo" },
  { Icon: Undo2, t: "Revoca quando vuoi", d: "Il controllo resta tuo" },
];

export function ClosingCTA() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20"
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(107,33,232,0.22),transparent_70%)]" />
        <div className="relative">
          <span className="text-xs font-bold tracking-[0.14em] text-violet-light">IL REGISTRO DEI VOLTI</span>
          <h2 className="mt-2 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Il tuo volto è <span className="text-gradient">tuo</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Rivendicalo nel registro. Decidi come può essere usato. Vieni pagato ogni volta.
          </p>

          <div className="mx-auto mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
            {POINTS.map(({ Icon, t, d }, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left"
              >
                <Icon className="h-5 w-5 text-teal" />
                <p className="mt-2 text-sm font-bold">{t}</p>
                <p className="text-xs text-muted">{d}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Rivendica il tuo volto</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/match">Esplora il registro</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
