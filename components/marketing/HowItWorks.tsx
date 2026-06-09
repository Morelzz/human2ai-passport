"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Search, Coins } from "lucide-react";
import { KineticText } from "@/components/motion/KineticText";

// [COME FUNZIONA] — Tre passi, dopo il manifesto. Copy verbatim da
// docs/SITE_COPY.md. I motori (Higgsfield/HeyGen) restano invisibili.

const STEPS = [
  {
    n: "01",
    t: "Una persona reale entra.",
    d: "Viene verificata, firma il proprio consenso e sceglie dove la sua immagine può vivere.",
    Icon: ShieldCheck,
    color: "text-violet",
    ring: "border-violet/40 bg-violet/10",
  },
  {
    n: "02",
    t: "Una richiesta arriva.",
    d: "Chi crea descrive ciò che gli serve. Il sistema cerca una persona reale che abbia acconsentito. Se non la trova, non genera. Punto.",
    Icon: Search,
    color: "text-crimson",
    ring: "border-crimson/40 bg-crimson/10",
  },
  {
    n: "03",
    t: "Il valore torna alla persona.",
    d: "A ogni utilizzo, una royalty matura nel portafoglio di chi ha messo il proprio volto. Il valore generato dall'AI torna all'essere umano da cui nasce.",
    Icon: Coins,
    color: "text-teal",
    ring: "border-teal/40 bg-teal/10",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HowItWorks() {
  return (
    <section id="come-funziona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        <KineticText text="Come funziona" />
      </h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            custom={i}
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="glass glass-hover rounded-2xl p-6"
          >
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${s.ring}`}>
              <s.Icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className={`text-xs font-extrabold tracking-widest ${s.color}`}>{s.n}</span>
              <h3 className="text-lg font-bold">{s.t}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
