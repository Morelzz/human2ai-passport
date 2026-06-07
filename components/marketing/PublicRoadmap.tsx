"use client";

import { motion, useReducedMotion } from "framer-motion";

// ──────────────────────────────────────────────────────────────────────────
// Roadmap PUBBLICA (visione, orizzonte 5 anni) — la "strada" che vede il
// visitatore. Fonte copy: docs/SITE_ROADMAP.md. NON mischiare con la roadmap
// interna di sviluppo. Testi verbatim dal documento (niente fasi inventate).
//
// Rendering (da doc): desktop = stepper orizzontale a 5 nodi; mobile = timeline
// verticale. Color-coding per stato: in corso = Crimson, completata = Teal,
// futura = Violet attenuato. Nodi esagonali numerati 01–05 (motivo geometrico
// pulito, niente icone giocose). Le date sono ORIZZONTI di visione, non impegni.
// ──────────────────────────────────────────────────────────────────────────

type Status = "done" | "current" | "future";

type Phase = {
  num: string;
  title: string;
  horizon: string;
  promise: string;
  body: string;
  status: Status;
};

const PHASES: Phase[] = [
  {
    num: "01",
    title: "Il Lancio",
    horizon: "Anno 1 · 2026 · in corso",
    promise: "HUMAN2AI esiste, e le prime persone reali guadagnano dal proprio volto.",
    body: "Apriamo le porte. Il Registro Volti pubblico è online, i primi esseri umani verificati entrano nel catalogo, e il primo giro completo gira davvero: una persona dà il consenso, un'immagine viene generata, una royalty viene pagata. La prova che la tesi non è un'idea — è una piattaforma che funziona.",
    status: "current",
  },
  {
    num: "02",
    title: "Il Filtro per tutti",
    horizon: "Anni 1–2 · 2026–2027",
    promise: "HUMAN2AI smette di essere un sito. Diventa un'infrastruttura che chiunque può integrare.",
    body: "Apriamo HUMAN2AI al mondo con una chiave API. Qualsiasi sito, piattaforma o strumento di generazione può integrare HUMAN2AI come filtro di protezione umana sul proprio sistema: prima di generare un essere umano, anche il software di un terzo dovrà passare dal nostro consenso. È il passaggio che ci trasforma da catalogo a standard — il filtro umano al 100%, ovunque l'AI crei persone.",
    status: "future",
  },
  {
    num: "03",
    title: "La Rete dei Volti",
    horizon: "Anni 2–3 · 2027–2028",
    promise: "Da decine di volti a una rete nazionale di persone che possiedono la propria immagine.",
    body: "Portiamo HUMAN2AI nelle città con eventi di acquisizione su larga scala, e apriamo tutti i livelli di ingresso — dal selfie allo studio. Il catalogo cresce da decine a migliaia di volti reali, e i brand trovano una persona vera per ogni esigenza. Nasce la gestione collettiva dei diritti d'immagine: una “SIAE dei volti” che incassa e ridistribuisce, per conto delle persone, ciò che il loro volto genera.",
    status: "future",
  },
  {
    num: "04",
    title: "Lo Standard",
    horizon: "Anni 3–4 · 2028–2029",
    promise: "Il marchio “Volto Verificato” diventa il segno di fiducia dell'era dell'AI.",
    body: "Il badge di provenienza HUMAN2AI diventa un riferimento riconosciuto: vederlo accanto a un contenuto significa “dietro c'è una persona reale, consenziente, pagata”. Espandiamo oltre l'Italia, in Europa e oltre, e iniziamo a far valere quei diritti anche fuori dalla piattaforma — ovunque un volto reale venga usato. In un mondo che non distingue più il vero dal sintetico, noi siamo la prova del vero.",
    status: "future",
  },
  {
    num: "05",
    title: "L'Infrastruttura Umana",
    horizon: "Anni 4–5 · 2029–2030 e oltre",
    promise: "Un'AI che lavora per le persone, su un'infrastruttura che rispetta il pianeta.",
    body: "Portiamo la generazione sulla nostra infrastruttura, alimentata a energia rinnovabile, con un'impronta di carbonio dichiarata e verificabile a ogni creazione. Riduciamo la dipendenza dai motori di terzi e chiudiamo il cerchio della visione: la tecnologia più avanzata al servizio degli esseri umani — non il contrario.",
    status: "future",
  },
];

const COLOR: Record<Status, string> = {
  done: "#00A896", // Precision Teal — completata
  current: "#B8005C", // Crimson Empathy — in corso
  future: "#6B21E8", // Deep Violet — futura
};

const HEX = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const EASE = [0.22, 1, 0.36, 1] as const;

export function PublicRoadmap() {
  const reduce = useReducedMotion();

  return (
    <section id="la-strada" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      {/* Intestazione */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold tracking-[0.16em] text-teal">LA STRADA</span>
        <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Dove stiamo andando
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Non costruiamo un prodotto. Costruiamo uno standard. Ecco come, un passo alla volta.
        </p>
      </div>

      {/* ── Desktop: stepper orizzontale a 5 nodi ─────────────────────────── */}
      <div className="relative mt-16 hidden lg:block">
        {/* Linea connettrice che si "disegna" allo scroll (origine a sinistra) */}
        <div className="absolute left-[10%] right-[10%] top-7 h-px -translate-y-1/2" aria-hidden>
          <motion.div
            className="h-full origin-left rounded-full"
            style={{ background: "linear-gradient(90deg,#B8005C 0%,#6B21E8 55%,rgba(107,33,232,0.25) 100%)" }}
            initial={reduce ? undefined : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: EASE }}
          />
        </div>

        <ol className="relative grid grid-cols-5 gap-5">
          {PHASES.map((p, i) => (
            <li key={p.num} className="flex flex-col items-center text-center">
              <HexNode phase={p} reduce={!!reduce} delay={0.15 + i * 0.12} />
              <motion.div
                className="mt-7 w-full"
                initial={reduce ? undefined : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
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
        {/* Linea verticale che si disegna dall'alto */}
        <div className="absolute bottom-2 left-7 top-2 w-px -translate-x-1/2" aria-hidden>
          <motion.div
            className="h-full w-full origin-top rounded-full"
            style={{ background: "linear-gradient(180deg,#B8005C 0%,#6B21E8 60%,rgba(107,33,232,0.2) 100%)" }}
            initial={reduce ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1.2, ease: EASE }}
          />
        </div>

        <ol className="space-y-6">
          {PHASES.map((p, i) => (
            <li key={p.num} className="relative flex gap-5">
              <div className="relative z-10 shrink-0">
                <HexNode phase={p} reduce={!!reduce} delay={0.1 + i * 0.1} />
              </div>
              <motion.div
                className="flex-1 pt-1"
                initial={reduce ? undefined : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
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

// Nodo esagonale numerato, con anello colorato per stato e pulsazione se "in corso".
function HexNode({ phase, reduce, delay }: { phase: Phase; reduce: boolean; delay: number }) {
  const c = COLOR[phase.status];
  return (
    <motion.div
      className="relative flex h-14 w-14 items-center justify-center"
      style={{ filter: phase.status === "current" ? `drop-shadow(0 0 12px ${c}88)` : undefined }}
      initial={reduce ? undefined : { opacity: 0, scale: 0.4 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {/* Pulsazione per la fase in corso */}
      {phase.status === "current" && !reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{ background: c, clipPath: HEX, WebkitClipPath: HEX }}
          animate={{ opacity: [0.45, 0, 0.45], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Esagono pieno (colore stato) = anello */}
      <span aria-hidden className="absolute inset-0" style={{ background: c, clipPath: HEX, WebkitClipPath: HEX }} />
      {/* Esagono interno scuro con lieve tinta = crea l'anello + glow interno */}
      <span
        aria-hidden
        className="absolute inset-[2px]"
        style={{ background: `radial-gradient(circle at 50% 35%, ${c}33, #0c0c14 75%)`, clipPath: HEX, WebkitClipPath: HEX }}
      />
      <span className="relative z-10 font-mono text-sm font-extrabold" style={{ color: c }}>
        {phase.num}
      </span>
    </motion.div>
  );
}

// Contenuto testuale di una fase: orizzonte → titolo → promessa → corpo.
function PhaseCard({ phase }: { phase: Phase }) {
  const c = COLOR[phase.status];
  const isCurrent = phase.status === "current";
  return (
    <div className="glass glass-hover h-full rounded-2xl p-5 text-left">
      <div className="flex items-center gap-2">
        <span className="text-[0.64rem] font-bold uppercase tracking-[0.12em]" style={{ color: isCurrent ? c : "#9ca3af" }}>
          {phase.horizon.split(" · ")[0]}
        </span>
        {isCurrent && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider"
            style={{ background: `${c}22`, color: c }}
          >
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
