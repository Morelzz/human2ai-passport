"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Fingerprint, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

// [FIDUCIA / PROVENIENZA] — Vicino al fondo: rende tangibile il fossato
// (passport, token, verifica pubblica). Tono "infrastruttura", sobrio.
// Copy verbatim da docs/SITE_COPY.md.

const EASE = [0.22, 1, 0.36, 1] as const;

const MARKS = [
  { Icon: Fingerprint, t: "Passaporto pubblico" },
  { Icon: BadgeCheck, t: "Identificativo certificato" },
  { Icon: ScanLine, t: "Verifica in un clic" },
];

export function Trust() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-70px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12"
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(127,174,150,0.12),transparent_70%)]" />
        <div className="relative">
          <span className="label-mono text-teal">Fiducia &amp; Provenienza</span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            La prova è parte del prodotto.
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-muted">
            Ogni volto ha un passaporto pubblico e un identificativo certificato: chiunque, in un clic,
            verifica che dietro un contenuto c&apos;è una persona reale, consenziente e pagata.
            Non chiediamo fiducia, la rendiamo verificabile.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
            {MARKS.map(({ Icon, t }) => (
              <div key={t} className="flex items-center gap-2 text-sm text-foreground">
                <Icon className="h-4 w-4 text-teal" />
                {t}
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="mt-8">
            <Link href="/verify">Verifica un contenuto</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
