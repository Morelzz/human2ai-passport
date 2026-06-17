"use client";

import { motion } from "framer-motion";
import { KineticText } from "@/components/motion/KineticText";

// [TENSIONE] — Subito sotto l'hero: la ragione per cui SEMBLIC esiste.
// Tipografia OVERSIZE protagonista (trend 2026): il problema in grande,
// una pausa luminosa, poi la svolta ancora più grande con gradiente vivo.
// Copy verbatim da docs/SITE_COPY.md.

const EASE = [0.22, 1, 0.36, 1] as const;

export function Tension() {
  return (
    <section className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-36">
      {/* Alone di fondo che dà aria alla sezione */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_40%,rgba(242,169,59,0.10),transparent_70%)]" />

      <span className="label-mono relative text-crimson-light">Il problema</span>

      {/* Il problema — grande, grigio, pesante */}
      <h2 className="relative mt-6 text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-muted sm:text-5xl">
        <KineticText text="L'AI ha imparato a fabbricare persone che non esistono." />
        <span className="mt-3 block text-2xl font-semibold text-faint sm:text-3xl">
          <KineticText text="Senza nome. Senza consenso. Senza nessuno dietro." delay={0.25} />
        </span>
      </h2>

      {/* La pausa — divisore luminoso che si disegna */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
        className="relative mx-auto my-12 h-px w-40 origin-center rounded-full bg-gradient-to-r from-transparent via-violet to-transparent shadow-[0_0_18px_rgba(242,169,59,0.6)]"
      />

      {/* La svolta — ancora più grande, viva. NB: spazi tra segmenti con {" "},
          mai dentro `text` (producevano buchi e a-capo sporchi). */}
      <p className="relative text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-[3.4rem] sm:leading-[1.06]">
        <KineticText text="Noi abbiamo scelto la strada opposta." />
        <span className="mt-4 block">
          <KineticText text="Qui ogni volto appartiene a una" delay={0.3} />{" "}
          <KineticText text="persona vera" gradient delay={0.5} />{" "}
          <KineticText text="che ha detto sì." delay={0.6} />
        </span>
      </p>
    </section>
  );
}
