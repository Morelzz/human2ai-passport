"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// [CTA FINALE] — Chiusura pagina. Concetto forte, una riga + button.
// Copy verbatim da docs/SITE_COPY.md.

export function ClosingCTA() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12 sm:py-24"
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(184,0,92,0.20),transparent_70%)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            L&apos;epoca dei volti senza nome <span className="text-gradient">finisce qui</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Unisciti alle persone che hanno deciso di possedere la propria immagine nell&apos;era dell&apos;AI.
          </p>
          <div className="mt-9">
            <Button asChild size="lg">
              <Link href="/signup">Entra in HUMAN2AI</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
