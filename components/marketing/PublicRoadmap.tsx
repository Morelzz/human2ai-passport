"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Rocket, Webhook, Network, BadgeCheck, Leaf, type LucideIcon } from "lucide-react";
import { KineticText } from "@/components/motion/KineticText";

// ──────────────────────────────────────────────────────────────────────────
// Roadmap PUBBLICA (visione, orizzonte 5 anni). Fonte copy: docs/SITE_ROADMAP.md.
// Redesign "cinematico": nodi grafici con ICONA + anello a gradiente (rotante per
// la fase in corso), linea che si disegna allo scroll, card con accento di stato.
// Color-coding: in corso = Crimson, completata = Teal, futura = Violet.
// ──────────────────────────────────────────────────────────────────────────

type Status = "done" | "current" | "future";

type Phase = {
  num: string;
  title: string;
  horizon: string;
  promise: string;
  body: string;
  status: Status;
  icon: LucideIcon;
};

const PHASES: Phase[] = [
  {
    num: "01",
    title: "Il Lancio",
    horizon: "Anno 1 · 2026 · in corso",
    promise: "HUMAN2AI esiste, e le prime persone reali guadagnano dal proprio volto.",
    body: "Il Registro Volti è online e il primo giro completo funziona davvero: una persona acconsente, un'immagine nasce, una royalty viene pagata. La tesi non è un'idea — è una piattaforma viva.",
    status: "current",
    icon: Rocket,
  },
  {
    num: "02",
    title: "Il Filtro per tutti",
    horizon: "Anni 1–2 · 2026–2027",
    promise: "HUMAN2AI smette di essere un sito. Diventa un'infrastruttura che chiunque può integrare.",
    body: "Una chiave API apre il filtro a qualsiasi piattaforma: prima di generare un essere umano, anche il software di terzi passerà dal nostro consenso. Da catalogo a standard.",
    status: "future",
    icon: Webhook,
  },
  {
    num: "03",
    title: "La Rete dei Volti",
    horizon: "Anni 2–3 · 2027–2028",
    promise: "Da decine di volti a una rete nazionale di persone che possiedono la propria immagine.",
    body: "Eventi di acquisizione nelle città, ingresso aperto a tutti — dal selfie allo studio. Il catalogo cresce a migliaia di volti e nasce la gestione collettiva dei diritti d'immagine: la “SIAE dei volti”.",
    status: "future",
    icon: Network,
  },
  {
    num: "04",
    title: "Lo Standard",
    horizon: "Anni 3–4 · 2028–2029",
    promise: "Il marchio “Volto Verificato” diventa il segno di fiducia dell'era dell'AI.",
    body: "Il badge HUMAN2AI accanto a un contenuto significa: persona reale, consenziente, pagata. Espandiamo in Europa e facciamo valere quei diritti anche fuori dalla piattaforma.",
    status: "future",
    icon: BadgeCheck,
  },
  {
    num: "05",
    title: "L'Infrastruttura Umana",
    horizon: "Anni 4–5 · 2029–2030 e oltre",
    promise: "Un'AI che lavora per le persone, su un'infrastruttura che rispetta il pianeta.",
    body: "Generazione sulla nostra infrastruttura, a energia rinnovabile, con impronta di carbonio dichiarata a ogni creazione. La tecnologia più avanzata al servizio degli umani — non il contrario.",
    status: "future",
    icon: Leaf,
  },
];

const COLOR: Record<Status, string> = {
  done: "#00A896",
  current: "#B8005C",
  future: "#6B21E8",
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function PublicRoadmap() {
  const reduce = useReducedMotion();

  return (
    <section id="la-strada" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      {/* Intestazione */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="label-mono text-teal">La strada</span>
        <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          <KineticText text="Dove stiamo andando" />
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Non costruiamo un prodotto. Costruiamo uno standard. Ecco come, un passo alla volta.
        </p>
      </div>

      {/* ── Desktop: stepper orizzontale a 5 nodi ─────────────────────────── */}
      <div className="relative mt-16 hidden lg:block">
        <div className="absolute left-[10%] right-[10%] top-8 h-px -translate-y-1/2" aria-hidden>
          <motion.div
            className="h-full origin-left rounded-full"
            style={{ background: "linear-gradient(90deg,#B8005C 0%,#6B21E8 55%,rgba(107,33,232,0.25) 100%)" }}
            initial={reduce ? undefined : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.3, ease: EASE }}
          />
        </div>

        <ol className="relative grid grid-cols-5 gap-5">
          {PHASES.map((p, i) => (
            <li key={p.num} className="flex flex-col items-center text-center">
              <IconNode phase={p} reduce={!!reduce} delay={0.15 + i * 0.12} />
              <motion.div
                className="mt-8 w-full"
                initial={reduce ? undefined : { opacity: 0, y: 22, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease: EASE }}
              >
                <PhaseCard phase={p} />
              </motion.div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Mobile / tablet: timeline verticale ───────────────────────────── */}
      <div className="relative mt-14 lg:hidden">
        <div className="absolute bottom-2 left-8 top-2 w-px -translate-x-1/2" aria-hidden>
          <motion.div
            className="h-full w-full origin-top rounded-full"
            style={{ background: "linear-gradient(180deg,#B8005C 0%,#6B21E8 60%,rgba(107,33,232,0.2) 100%)" }}
            initial={reduce ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1.3, ease: EASE }}
          />
        </div>

        <ol className="space-y-6">
          {PHASES.map((p, i) => (
            <li key={p.num} className="relative flex gap-5">
              <div className="relative z-10 shrink-0">
                <IconNode phase={p} reduce={!!reduce} delay={0.1 + i * 0.1} />
              </div>
              <motion.div
                className="flex-1 pt-1"
                initial={reduce ? undefined : { opacity: 0, x: 18, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.55, delay: 0.12 + i * 0.1, ease: EASE }}
              >
                <PhaseCard phase={p} />
              </motion.div>
            </li>
          ))}
        </ol>
      </div>

      {/* Chiusura + nota onestà sulle date */}
      <div className="mx-auto mt-16 max-w-xl text-center">
        <p className="text-balance text-lg font-semibold text-foreground sm:text-xl">
          Ogni fase è una promessa che diventa codice. <span className="text-crimson">Siamo alla prima.</span>
        </p>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          Gli orizzonti temporali indicano la nostra visione, non impegni contrattuali. Gli anni sono indicativi.
        </p>
      </div>
    </section>
  );
}

// ── Review B5: versione CONDENSATA per /trasparenza ────────────────────────
// La roadmap completa vive SOLO in home (#la-strada); qui 5 righe essenziali
// (numero, titolo, orizzonte, stato) dalla STESSA fonte PHASES + link alla
// versione completa. Niente doppione.
export function PublicRoadmapCompact() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <div className="text-center">
        <span className="label-mono text-teal">La strada</span>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Dove stiamo andando</h2>
      </div>
      <ol className="mt-8 space-y-2">
        {PHASES.map((p) => {
          const c = COLOR[p.status];
          const isCurrent = p.status === "current";
          return (
            <li key={p.num} className="glass flex items-center gap-4 rounded-full px-5 py-3">
              <span className="font-mono text-[0.65rem] font-extrabold" style={{ color: c }}>{p.num}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.title}</span>
              {isCurrent && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background: `${c}22`, color: c }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                  In corso
                </span>
              )}
              <span className="hidden shrink-0 text-xs text-faint sm:block">{p.horizon.split(" · ")[0]}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-center">
        <Link href="/#la-strada" className="text-sm font-semibold text-violet-light transition-colors hover:text-foreground">
          La roadmap completa, fase per fase →
        </Link>
      </p>
    </section>
  );
}

// Nodo grafico: disco con ICONA, anello a gradiente (rotante per la fase in
// corso), glow, chip col numero. Sostituisce il vecchio esagono numerato.
function IconNode({ phase, reduce, delay }: { phase: Phase; reduce: boolean; delay: number }) {
  const c = COLOR[phase.status];
  const Icon = phase.icon;
  const isCurrent = phase.status === "current";
  return (
    <motion.div
      className="relative flex h-16 w-16 items-center justify-center"
      initial={reduce ? undefined : { opacity: 0, scale: 0.4 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {/* Glow */}
      <span aria-hidden className="absolute inset-0 rounded-full blur-xl" style={{ background: `radial-gradient(circle, ${c}66, transparent 70%)`, opacity: isCurrent ? 0.9 : 0.5 }} />

      {/* Ping pulsante per la fase in corso */}
      {isCurrent && !reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${c}` }}
          animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.45, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Anello a gradiente conico (ruota; più veloce per la fase in corso) */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(from 0deg, ${c}, transparent 35%, ${c}aa 65%, ${c})` }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: isCurrent ? 8 : 22, repeat: Infinity, ease: "linear" }}
      />
      {/* Disco interno scuro = crea l'anello */}
      <span aria-hidden className="absolute inset-[2.5px] rounded-full" style={{ background: `radial-gradient(circle at 50% 30%, ${c}2e, #0b0b12 78%)` }} />

      {/* Icona */}
      <Icon className="relative z-10 h-6 w-6" style={{ color: c }} strokeWidth={1.8} />

      {/* Chip numero */}
      <span
        className="absolute -bottom-1 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[0.6rem] font-extrabold"
        style={{ background: c, color: "#0b0b12" }}
      >
        {phase.num}
      </span>
    </motion.div>
  );
}

// Card di fase: accento di stato in alto, orizzonte → titolo → promessa → corpo.
function PhaseCard({ phase }: { phase: Phase }) {
  const c = COLOR[phase.status];
  const isCurrent = phase.status === "current";
  return (
    <div className="glass glass-hover relative h-full overflow-hidden rounded-2xl p-5 text-left">
      {/* Accento superiore nel colore di stato */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${c}, transparent)` }} />
      <div className="flex items-center gap-2">
        <span className="text-[0.64rem] font-bold uppercase tracking-[0.12em]" style={{ color: isCurrent ? c : "#9ca3af" }}>
          {phase.horizon.split(" · ")[0]}
        </span>
        {isCurrent && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background: `${c}22`, color: c }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
            In corso
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[0.68rem] text-faint">{phase.horizon.replace(/^[^·]+· /, "")}</p>

      <h3 className="mt-2 text-lg font-extrabold leading-tight">{phase.title}</h3>
      <p className="mt-2 text-sm font-semibold leading-snug" style={{ color: isCurrent ? "#f0f0f5" : "#c4b5fd" }}>
        {phase.promise}
      </p>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">{phase.body}</p>
    </div>
  );
}
