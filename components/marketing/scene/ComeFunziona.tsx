"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ScanFace } from "lucide-react";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";

// ──────────────────────────────────────────────────────────────────────────
// COME FUNZIONA, SENZA CARTE CHE SI COPRONO (1/10/2026). Le carte impilate si
// sovrapponevano: nel punto 3 la carta di sotto restava a meta' con il titolo
// tagliato sotto quella nera ("sembra fatto in AI", Morelz). Qui i quattro
// passi stanno a sinistra e a destra c'e' quello che succede davvero in ogni
// passo, con gli stessi elementi del prodotto. Sul computer il riquadro resta
// fermo e cambia mentre scorri; sul telefono ogni passo ha il suo disegno
// sotto, uno dopo l'altro, e niente si sovrappone.
//
// Tutto quello che si vede e' vero: la scena e la foto sono uno scatto reale
// (Chiara, certificato 9b50c5d1, volto misurato 93%), i prezzi sono quelli
// pagati. Se Chiara revoca il consenso la foto esce e restano le parole.
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const EASE = [0.23, 1, 0.32, 1] as const;

export interface FotoCF {
  src960: string;
  nome: string;
  certificato: string;
  grossCents: number;
  royaltyCents: number;
  somiglianza: number;
}

const PASSI = [
  { t: "Scegli un volto vero.", d: "Solo persone che hanno verificato l'identità e detto sì. Nessun volto inventato, nessun volto rubato." },
  { t: "Scrivi la scena.", d: "Prima di spendere un centesimo, Semblic la legge contro i limiti che la persona ha scritto con parole sue. Se non va, non parte." },
  { t: "Lo scatto viene controllato.", d: "Il volto si misura sul risultato e un secondo occhio guarda la qualità. Se non tiene, non lo paghi." },
  { t: "Certificato, e la persona è pagata.", d: "Filigrana invisibile, certificato pubblico su Sigil, e la sua parte a ogni scatto. Revoca quando vuole." },
] as const;

const Spunta = () => (
  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-verified text-[#0F2A17]"><Check className="h-3 w-3" strokeWidth={3} /></span>
);

function Visual({ i, ritratti, foto }: { i: number; ritratti: { gabriella: string; chiara: string }; foto: FotoCF | null }) {
  const nome = foto?.nome ?? "Chiara";
  if (i === 0) {
    return (
      <div className="grid gap-3">
        {[{ n: "Gabriella", s: ritratti.gabriella, t: "consenso attivo, letto adesso", spento: false }, { n: "Chiara", s: ritratti.chiara, t: "consenso attivo", spento: true }].map((p) => (
          <div key={p.n} className={`flex items-center gap-4 rounded-[20px] border border-border bg-surface p-3.5 ${p.spento ? "scale-[0.96] opacity-60" : "shadow-[0_24px_50px_-34px_rgba(23,21,15,0.5)]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.s} alt="" width={96} height={120} loading="lazy" decoding="async" className="h-[120px] w-[96px] rounded-[14px] object-cover object-[50%_15%]" />
            <div>
              <b className="block text-[1.2rem] tracking-[-0.02em]">{p.n}</b>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-verified-soft px-3 py-1 text-[0.8rem] font-semibold text-on-verified"><i aria-hidden className="h-[7px] w-[7px] rounded-full bg-verified" />{p.t}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="grid gap-3.5">
        <div className="rounded-[20px] border border-border bg-surface p-5 shadow-[0_24px_50px_-34px_rgba(23,21,15,0.5)]">
          <p className="text-[1.1rem] leading-[1.45]">
            in una via del centro storico nel <span className="border-b-2 border-amber">tardo pomeriggio</span>, <span className="border-b-2 border-amber">cappotto color cammello</span>, maglietta bianca e jeans scuri
          </p>
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {[["Naturale", false], ["Luce", false], ["✦ Vestiti · 1", true], ["Verticale", false]].map(([l, on]) => (
              <span key={String(l)} className={`inline-flex h-8 items-center rounded-full border px-3 text-[0.82rem] ${on ? "border-transparent bg-amber-soft font-semibold text-on-amber" : "border-border"}`}>{l}</span>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 px-1 text-[0.9rem] font-semibold text-verified"><Spunta />Letta contro i limiti di {nome}: si può fare</p>
      </div>
    );
  }
  if (i === 2) {
    return foto ? (
      <div className="relative mx-auto aspect-[2/3] h-full max-h-[460px] overflow-hidden rounded-[22px] shadow-[0_30px_60px_-36px_rgba(23,21,15,0.55)] max-lg:max-w-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.src960} alt={`${nome} in una via del centro storico: scatto certificato`} loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_22%]" />
        <span className="absolute bottom-3 left-3 inline-flex h-[34px] items-center gap-2 rounded-full bg-[rgba(17,14,9,0.66)] px-3.5 text-[0.84rem] text-[#F7F1E6] backdrop-blur-md"><ScanFace className="h-4 w-4" strokeWidth={1.8} />Volto misurato {foto.somiglianza}%, tiene</span>
      </div>
    ) : (
      <p className="rounded-[20px] border border-border bg-surface p-6 text-[1.05rem]">Il volto viene misurato sul risultato: se non tiene, lo scatto non arriva a te.</p>
    );
  }
  return (
    <div className="grid gap-2.5 rounded-[22px] bg-[#17150F] p-5 text-[#F7F4EE] shadow-[0_30px_60px_-36px_rgba(23,21,15,0.7)]">
      {[
        ["Certificato", foto ? foto.certificato.slice(0, 8) : "pubblico su Sigil", "font-mono"],
        ["Filigrana", "invisibile, presente", ""],
        ["Chi l'ha creata ha pagato", foto ? euro(foto.grossCents) : "il prezzo in chiaro", ""],
      ].map(([a, b, c]) => (
        <div key={a} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2.5 text-[0.92rem] text-[#cfc6b5]">
          <span>{a}</span><b className={`font-semibold text-[#F7F4EE] ${c}`}>{b}</b>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 pt-0.5 text-[0.92rem] text-[#cfc6b5]">
        <span>{nome} riceve</span>
        <b className="text-[1.6rem] font-semibold tracking-[-0.02em] tabular-nums text-[#9BE3AE]">{foto ? euro(foto.royaltyCents) : "la sua parte"}</b>
      </div>
    </div>
  );
}

export function ComeFunziona({ ritratti, foto }: { ritratti: { gabriella: string; chiara: string }; foto: FotoCF | null }) {
  const ferma = useReducedMotionSafe();
  const [attivo, setAttivo] = useState(0);
  const passi = useRef<(HTMLLIElement | null)[]>([]);

  // Sul computer il passo "attivo" e' quello che sta a meta' schermo.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const ios = passi.current.map((el, i) => {
      if (!el) return null;
      const io = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting && mq.matches) setAttivo(i); },
        { rootMargin: "-45% 0px -45% 0px" },
      );
      io.observe(el);
      return io;
    });
    return () => ios.forEach((io) => io?.disconnect());
  }, []);

  return (
    <section aria-labelledby="titolo-passi" className="mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-8 lg:pb-28">
      <h2 id="titolo-passi" className="text-[2.4rem] font-bold leading-none tracking-[-0.045em] sm:text-[3.4rem] lg:text-[4.2rem]">Come funziona.</h2>
      <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <ol>
          {PASSI.map((p, i) => (
            <li
              key={p.t}
              ref={(el) => { passi.current[i] = el; }}
              className={`border-t border-border py-7 transition-opacity duration-500 sm:py-9 lg:min-h-[58svh] lg:py-12 ${attivo === i ? "lg:opacity-100" : "lg:opacity-40"}`}
            >
              <span className="font-mono text-[0.78rem] text-amber-ink">{i + 1} di 4</span>
              <h3 className="mt-2 text-[1.7rem] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[2.2rem]">{p.t}</h3>
              <p className="mt-3 max-w-[40ch] text-[1.04rem] leading-relaxed text-muted">{p.d}</p>
              {/* Telefono: il disegno del passo sta qui sotto. */}
              <div className="mt-6 lg:hidden">
                <Visual i={i} ritratti={ritratti} foto={foto} />
              </div>
            </li>
          ))}
        </ol>

        {/* Computer: un riquadro fermo che cambia con il passo. */}
        <div className="hidden lg:block">
          <div className="sticky top-[6.5rem] flex h-[min(560px,calc(100svh-8rem))] items-center justify-center overflow-hidden rounded-[28px] border border-border bg-[var(--hairline-soft)] p-8">
            <div className="w-full max-w-[460px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={attivo}
                  initial={ferma ? false : { opacity: 0, y: 16, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={ferma ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="h-full"
                >
                  <Visual i={attivo} ritratti={ritratti} foto={foto} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
