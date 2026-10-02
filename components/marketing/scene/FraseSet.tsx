"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";

// ──────────────────────────────────────────────────────────────────────────
// "UNA FRASE. IL RESTO LO FA IL SET", CON LA FRASE CHE SI SCRIVE (1/10/2026).
// Prima erano quattro schede ferme. Ora la scena fa vedere il prodotto: la
// frase si scrive, il direttore accende la pillola della luce (ha letto
// "grande finestra"), Semblic legge la scena contro i limiti della persona e
// arriva lo scatto vero. E' la stessa cosa che succede in Crea, in dieci
// secondi. La frase e' quella con cui lo scatto e' stato fatto davvero (Greta,
// luce morbida da finestra). Parte quando entra nello schermo; con "riduci
// animazioni" e' gia' tutto finito. Se Greta revoca il consenso la foto esce.
// ──────────────────────────────────────────────────────────────────────────

const FRASE = "seduta vicino a una grande finestra, in un appartamento luminoso, di mattina, con le piante sul davanzale e un sorriso leggero";
const MARK = "grande finestra";
const EASE = [0.23, 1, 0.32, 1] as const;
const POI = ["una variante", "una serie di situazioni", "due persone nella stessa foto", "lo scatto che si muove"];

export interface FotoSet {
  src960: string;
  fuoco: string;
  nome: string;
  certificato: string;
  ritratto: string;
}

export function FraseSet({ foto }: { foto: FotoSet | null }) {
  const ferma = useReducedMotionSafe();
  const radice = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [n, setN] = useState(0);
  const [letta, setLetta] = useState(false);
  const [esito, setEsito] = useState(false);

  const fine = FRASE.length;
  const mi = FRASE.indexOf(MARK);
  const luceAccesa = n >= mi + MARK.length + 1;

  const parti = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setLetta(false);
    setEsito(false);
    if (ferma) { setN(fine); setLetta(true); setEsito(true); return; }
    setN(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= fine) {
        if (timer.current) clearInterval(timer.current);
        setTimeout(() => setLetta(true), 450);
        setTimeout(() => setEsito(true), 1400);
      }
    }, 34);
  }, [ferma, fine]);

  useEffect(() => {
    const el = radice.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { parti(); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => { io.disconnect(); if (timer.current) clearInterval(timer.current); };
  }, [parti]);

  const scritto = FRASE.slice(0, n);
  const prima = scritto.slice(0, mi);
  const dentro = scritto.slice(mi, mi + MARK.length);
  const dopo = scritto.slice(mi + MARK.length);

  return (
    <section id="il-set" aria-labelledby="titolo-set" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
      <h2 id="titolo-set" className="max-w-[18ch] text-balance text-[2.3rem] font-bold leading-[1] tracking-[-0.045em] sm:text-[3.6rem]">Una frase. Il resto lo fa il set.</h2>
      <p className="mt-4 max-w-[50ch] text-[1.08rem] leading-relaxed text-muted">Scrivi cosa succede. Il set sceglie una persona vera del registro, la mette in scena e misura quanto resta se stessa.</p>

      <div ref={radice} className="mt-9 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5 shadow-[0_34px_70px_-44px_rgba(23,21,15,0.4)] sm:p-7">
          {foto && (
            <span className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-amber-soft pl-1.5 pr-4 text-[0.92rem] font-semibold text-on-amber">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.ritratto} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full object-cover object-[50%_15%]" />
              {foto.nome}
            </span>
          )}
          <p className="min-h-[7.4em] text-[1.25rem] leading-[1.45] sm:min-h-[5.8em] sm:text-[1.4rem]">
            {/* Chi usa uno screen reader legge la frase intera subito; la scrittura a mano e' solo per gli occhi. */}
            <span className="sr-only">{FRASE}</span>
            <span aria-hidden>
              {prima}
              <span className={dentro ? "border-b-2 border-amber" : ""}>{dentro}</span>
              {dopo}
              {n < fine && !ferma && <i className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.18em] animate-pulse bg-foreground" />}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-[0.86rem]">Naturale</span>
            <motion.span
              key={luceAccesa ? "su" : "giu"}
              initial={luceAccesa && !ferma ? { scale: 0.92 } : false}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[0.86rem] transition-colors duration-300 ${luceAccesa ? "border-transparent bg-amber-soft font-semibold text-on-amber" : "border-border"}`}
            >
              {luceAccesa ? "✦ Finestra" : "Luce"}
            </motion.span>
            <span className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-[0.86rem]">Verticale</span>
            <span className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-[0.86rem]">Alta</span>
          </div>
          <p className={`flex items-center gap-2 text-[0.9rem] font-semibold text-verified transition-opacity duration-500 ${letta ? "opacity-100" : "opacity-0"}`} aria-live="polite">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-verified text-[#0F2A17]"><Check className="h-3 w-3" strokeWidth={3} /></span>
            Letta contro i limiti di {foto?.nome ?? "lei"}: si può fare
          </p>
          <button type="button" onClick={parti} className="mt-auto inline-flex h-10 w-fit items-center rounded-full border border-border px-4 text-[0.88rem] font-semibold text-muted transition-colors hover:border-amber hover:text-foreground">
            Rivedi
          </button>
        </div>

        <div className="relative min-h-[430px] overflow-hidden rounded-[28px] bg-[var(--hairline)] lg:min-h-[520px]">
          {foto && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.src960}
                alt={`${foto.nome}, seduta vicino a una finestra in un appartamento luminoso: scatto certificato`}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: foto.fuoco }}
                className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms] ease-out ${esito ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}
              />
              <div className={`absolute bottom-3.5 left-3.5 flex flex-wrap gap-1.5 transition-opacity delay-500 duration-700 ${esito ? "opacity-100" : "opacity-0"}`}>
                <span className="rounded-full bg-[rgba(17,14,9,0.66)] px-3 py-1.5 text-[0.8rem] text-[#F7F1E6] backdrop-blur-md">{foto.nome}</span>
                <span className="rounded-full bg-[rgba(17,14,9,0.66)] px-3 py-1.5 font-mono text-[0.76rem] text-[#F7F1E6] backdrop-blur-md">Certificato {foto.certificato.slice(0, 8)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-5 flex flex-wrap items-center gap-2 text-[0.95rem] text-muted">
        E poi:
        {POI.map((t) => (
          <span key={t} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[0.86rem] font-semibold text-foreground">{t}</span>
        ))}
      </p>
    </section>
  );
}
