"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Fingerprint, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientFlowText } from "@/components/marketing/GradientFlowText";
import { SectionTitle } from "@/components/marketing/SectionTitle";

// [SIGIL — il verificatore] — Il verificatore pubblico ha un nome: Sigil.
// La sezione spiega cos'e (incolli un contenuto, sai se dietro c'e una persona
// reale, consenziente e pagata) e usa il campo particellare WebGL (VoidField),
// lo stesso della chiusura. Copy: niente trattini lunghi.

const EASE = [0.22, 1, 0.36, 1] as const;

// VoidField: chunk three.js separato, mai SSR; montato solo vicino al viewport.
const VoidField = dynamic(() => import("@/components/three/VoidField"), { ssr: false });

const MARKS = [
  { Icon: Fingerprint, t: "Passaporto pubblico" },
  { Icon: BadgeCheck, t: "Certificazione" },
  { Icon: ScanLine, t: "Verifica in un clic" },
];

export function Trust() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
      <SectionTitle subtitle="Verifica chi c'è dietro a un contenuto.">Sigil</SectionTitle>
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-70px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12"
      >
        {/* Campo particellare WebGL (lo stesso della chiusura), sfumato ai bordi */}
        {near && !reduce && (
          <VoidField className="absolute inset-0 opacity-60 [mask-image:radial-gradient(85%_75%_at_50%_45%,#000_45%,transparent_100%)] [-webkit-mask-image:radial-gradient(85%_75%_at_50%_45%,#000_45%,transparent_100%)]" />
        )}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(127,174,150,0.12),transparent_70%)]" />

        <div className="relative max-w-2xl">
          <span className="label-mono text-teal">Sigil · il verificatore</span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            <GradientFlowText>La prova</GradientFlowText> è parte del prodotto.
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Sigil è il verificatore pubblico di SEMBLIC: incolli un contenuto e in un clic sai se
            dietro c&apos;è una persona reale, consenziente e pagata. Non chiediamo fiducia: la rendiamo
            verificabile.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {MARKS.map(({ Icon, t }) => (
              <div key={t} className="flex items-center gap-2 text-sm text-foreground">
                <Icon className="h-4 w-4 text-teal" />
                {t}
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="mt-8">
            <Link href="/verify">Verifica con Sigil</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
