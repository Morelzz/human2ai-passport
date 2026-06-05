"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Coins, BadgeCheck } from "lucide-react";

const STEPS = [
  { n: "01", t: "Consenso", d: "Una persona reale rivendica il proprio volto, verifica l'identità e dichiara gli usi autorizzati.", Icon: ShieldCheck, color: "text-violet", ring: "border-violet/40 bg-violet/10" },
  { n: "02", t: "Generazione", d: "Chi crea sceglie un volto consenziente. Senza consenso, niente generazione.", Icon: Sparkles, color: "text-crimson", ring: "border-crimson/40 bg-crimson/10" },
  { n: "03", t: "Royalty", d: "Ogni generazione paga la persona reale: l'80% a lei, accumulo e payout.", Icon: Coins, color: "text-teal", ring: "border-teal/40 bg-teal/10" },
  { n: "04", t: "Certificato", d: "Ogni contenuto esce con un token verificabile da chiunque, per sempre.", Icon: BadgeCheck, color: "text-violet-light", ring: "border-violet/40 bg-violet/10" },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function HowItWorks() {
  return (
    <section id="come-funziona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
      <motion.p
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="text-center text-xs tracking-[0.18em] text-faint"
      >
        IL LOOP DEL CONSENSO
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-2 text-center text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Quattro passi, un patto.
      </motion.h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <p className="mt-10 text-center text-sm text-muted">
        Hai un&apos;immagine generata?{" "}
        <Link href="/verify" className="font-semibold text-teal hover:underline">Verifica il suo certificato →</Link>
      </p>
    </section>
  );
}
