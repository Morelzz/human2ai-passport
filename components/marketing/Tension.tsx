"use client";

import { motion } from "framer-motion";

// [TENSIONE] — Subito sotto l'hero: la ragione per cui HUMAN2AI esiste.
// Testo grande centrato, due frasi-problema, una pausa, poi la svolta.
// Copy verbatim da docs/SITE_COPY.md.

const EASE = [0.22, 1, 0.36, 1] as const;

export function Tension() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
      {/* Il problema */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="text-balance text-2xl font-semibold leading-snug text-muted sm:text-3xl"
      >
        L&apos;intelligenza artificiale ha imparato a fabbricare persone che non esistono.
        Volti senza nome, senza consenso, senza nessuno dietro a cui rispondere.
      </motion.p>

      {/* La pausa */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
        className="mx-auto my-10 h-px w-16 origin-center rounded-full bg-gradient-to-r from-transparent via-violet to-transparent"
      />

      {/* La svolta */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        className="text-balance text-2xl font-bold leading-snug text-foreground sm:text-3xl"
      >
        Noi abbiamo scelto la strada opposta.
        <br className="hidden sm:block" />
        Su HUMAN2AI ogni essere umano generato <span className="text-gradient">esiste davvero</span> — e ha detto di sì.
      </motion.p>
    </section>
  );
}
