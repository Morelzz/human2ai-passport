"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { Magnetic } from "@/components/motion/Magnetic";
import { IlSetVideo } from "@/components/marketing/IlSetVideo";
import type { ScattoVetrina } from "@/lib/vetrina";

// ──────────────────────────────────────────────────────────────────────────
// L'HERO, RIFATTO (1/10/2026). Il primo era una foto a tutto schermo con il
// titolo sopra, la lente che girava e il riquadro di verifica: troppe cose
// insieme, "sembra fatto in AI" (Morelz). Adesso e' chiaro e semplice: il
// titolo su fondo chiaro, e di fianco lei, in un loop di 5 secondi fatto dal
// nostro Anima (lo stesso clip della scheda "Lo scatto si muove": una spinta
// lenta e un sorriso che compare, nient'altro). Sopra il video solo due cose
// vere: chi e' e che il consenso e' attivo, e che il video e' muto.
//
// Regole: il poster (e' l'LCP) e' nell'HTML dal primo byte, mai opacita' a zero;
// con "riduci animazioni" resta il poster fermo; il video parte solo quando e'
// sullo schermo. Se Gabriella revoca il consenso (la vetrina torna null) il
// video sparisce da solo e resta il testo.
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const EASE = [0.23, 1, 0.32, 1] as const; // ease-out deciso (Emil Kowalski)

// Il clip e il poster stanno nel sito (public/home), non nel bucket di Supabase:
// la home li scarica a ogni visita e il traffico del bucket e' a pagamento oltre
// il piano. Sono lo stesso clip della scheda Anima (Gabriella, 5 s, muto).
const VIDEO = "/home/anima-gabriella.mp4";
const POSTER = "/home/anima-f0.webp";

export function HeroCinema({ vetrina, prezzoDaCent }: { vetrina: ScattoVetrina | null; prezzoDaCent: number }) {
  const ferma = useReducedMotionSafe();
  // Il clip e' di Gabriella: si mostra solo se il suo consenso e' vivo.
  const conVideo = vetrina?.handle === "gabriella";
  const righeTitolo = ["Ogni volto qui", "ha detto sì."];

  return (
    <section aria-labelledby="titolo-home" className="relative mx-auto max-w-[1380px] px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10 lg:pt-14">
      <div className={`grid items-center gap-9 lg:gap-16 ${conVideo ? "lg:grid-cols-[1.08fr_0.92fr]" : ""}`}>
        <div>
          <h1 id="titolo-home" className="text-[2.85rem] font-bold leading-[0.96] tracking-[-0.055em] sm:text-[4.6rem] lg:text-[5.4rem]">
            {righeTitolo.map((riga, i) => (
              <span key={riga} className="block overflow-hidden pb-[0.07em]">
                <motion.span
                  className="block whitespace-nowrap"
                  initial={ferma ? false : { y: "105%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: ferma ? 0 : 0.1 + i * 0.1, duration: 0.95, ease: EASE }}
                >
                  {riga}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            className="mt-5 max-w-[38ch] text-[1.12rem] leading-relaxed text-muted sm:text-[1.25rem]"
            initial={ferma ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ferma ? 0 : 0.5, duration: 0.7, ease: EASE }}
          >
            Foto e video con persone vere che hanno dato il consenso. Ogni scatto è certificato e paga chi ci mette la faccia.
          </motion.p>
          <motion.div
            className="mt-7 flex flex-col gap-3 sm:flex-row"
            initial={ferma ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ferma ? 0 : 0.65, duration: 0.7, ease: EASE }}
          >
            <Magnetic strength={0.2} className="flex"><Link
              href="/match"
              className="group inline-flex min-h-[56px] w-full items-center justify-center gap-3 whitespace-nowrap rounded-full bg-amber px-8 text-[1.05rem] font-bold text-on-amber transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-amber-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground sm:w-auto"
            >
              Crea con volti veri
              <span className="whitespace-nowrap rounded-full bg-black/10 px-2.5 py-0.5 text-[0.88rem] font-semibold tabular-nums max-[400px]:hidden">da {euro(prezzoDaCent)}</span>
            </Link></Magnetic>
            <Magnetic strength={0.2} className="flex"><Link
              href="/entra"
              className="inline-flex min-h-[56px] w-full items-center justify-center whitespace-nowrap rounded-full border border-edge bg-surface px-8 text-[1.05rem] font-semibold text-foreground transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-amber active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground sm:w-auto"
            >
              Metti il tuo volto
            </Link></Magnetic>
          </motion.div>
          <motion.p
            className="mt-5 flex items-center gap-2 text-[0.92rem] text-faint"
            initial={ferma ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: ferma ? 0 : 0.9, duration: 0.8 }}
          >
            <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-verified" />
            Il consenso si legge prima di ogni scatto, non dopo.
          </motion.p>
        </div>

        {conVideo && vetrina && (
          <motion.div
            className="relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-[28px] bg-[var(--hairline)] shadow-[0_50px_90px_-50px_rgba(23,21,15,0.55)] max-lg:max-h-[74svh] lg:mx-0 lg:ml-auto lg:max-w-[500px]"
            initial={ferma ? false : { scale: 1.035 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, duration: 1.4, ease: EASE }}
          >
            {/* Il poster nell'HTML (LCP); il video ci parte sopra quando e' sullo schermo. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POSTER} alt={`${vetrina.nome}: scatto certificato, la persona sorride piano`} width={540} height={810} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_12%]" />
            <IlSetVideo src={VIDEO} poster={POSTER} className="absolute inset-0 h-full w-full object-cover object-[50%_12%]" />

            {/* Quattro angoli sul volto: si chiudono una volta e restano. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-[11%_20%_auto] h-[36%]"
              initial={ferma ? false : { opacity: 0, scale: 1.14 }}
              animate={{ opacity: [0, 1, 1, 0.55], scale: 1 }}
              transition={{ delay: ferma ? 0 : 1.1, duration: 1.8, ease: EASE, times: [0, 0.3, 0.7, 1] }}
            >
              <i className="absolute left-0 top-0 h-[26px] w-[26px] rounded-tl-[7px] border-l-2 border-t-2 border-white/90" />
              <i className="absolute right-0 top-0 h-[26px] w-[26px] rounded-tr-[7px] border-r-2 border-t-2 border-white/90" />
              <i className="absolute bottom-0 left-0 h-[26px] w-[26px] rounded-bl-[7px] border-b-2 border-l-2 border-white/90" />
              <i className="absolute bottom-0 right-0 h-[26px] w-[26px] rounded-br-[7px] border-b-2 border-r-2 border-white/90" />
            </motion.div>

            <motion.span
              className="absolute bottom-3.5 left-3.5 inline-flex h-[34px] items-center gap-2 rounded-full bg-[rgba(17,14,9,0.62)] px-3.5 text-[0.82rem] text-[#F7F1E6] backdrop-blur-md"
              initial={ferma ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ferma ? 0 : 1.6, duration: 0.6, ease: EASE }}
            >
              <i aria-hidden className="h-2 w-2 rounded-full bg-[#3DDC97]" />
              {vetrina.nome} · consenso attivo
            </motion.span>
            <motion.span
              className="absolute bottom-3.5 right-3.5 hidden h-[34px] items-center rounded-full bg-[rgba(17,14,9,0.62)] px-3.5 font-mono text-[0.74rem] text-[#F7F1E6] backdrop-blur-md sm:inline-flex"
              initial={ferma ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ferma ? 0 : 1.75, duration: 0.6, ease: EASE }}
            >
              5 secondi, senza audio
            </motion.span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
