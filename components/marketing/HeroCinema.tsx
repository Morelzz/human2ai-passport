"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check, ScanFace } from "lucide-react";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { Magnetic } from "@/components/motion/Magnetic";
import type { ScattoVetrina } from "@/lib/vetrina";

// ──────────────────────────────────────────────────────────────────────────
// L'HERO VERO (27/9/2026, dopo "e' estremamente piatto, non c'e' un hero").
// Tutto schermo, lo scatto certificato vero di Gabriella, e sopra il
// meccanismo di Semblic che lavora davanti agli occhi: una lente trova il
// volto, lo verifica, e le righe della verifica si spuntano una dopo l'altra
// (volto, consenso, certificato, quanto va a lei). Il titolo entra parola per
// parola, la foto respira (lento zoom indietro) e scorrendo va in parallasse.
//
// Regole: la foto e' visibile dal primo byte (e' l'LCP: solo transform, mai
// opacita' a zero); con "riduci animazioni" la pagina e' ferma e completa;
// il primo render e' uguale a server e browser (useReducedMotionSafe).
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const EASE = [0.23, 1, 0.32, 1] as const; // ease-out deciso (Emil Kowalski)

// Dove sta il volto nello scatto d20b966b1352 (1536x1024), in % dell'immagine.
const VOLTO = { left: 36.5, top: 11, width: 18, height: 33 };

export function HeroCinema({ vetrina, prezzoDaCent }: { vetrina: ScattoVetrina | null; prezzoDaCent: number }) {
  const ferma = useReducedMotionSafe();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yFoto = useTransform(scrollYProgress, [0, 1], ["0%", ferma ? "0%" : "9%"]);
  const yTesto = useTransform(scrollYProgress, [0, 1], ["0%", ferma ? "0%" : "-18%"]);

  // Tre righe decise a mano: nessun "si'." che resta solo, e il volto libero a destra.
  const righeTitolo = ["Ogni volto", "qui ha", "detto sì."];
  const righe = vetrina
    ? [
        `Volto riconosciuto: ${vetrina.nome}`,
        "Consenso attivo, letto adesso",
        `Certificato ${vetrina.certificato.slice(0, 8)}`,
        `${euro(vetrina.allaPersonaCent)} a ${vetrina.nome} per questo scatto`,
      ]
    : [];

  // Tempi dell'unica sequenza: titolo, poi la lente, poi la verifica riga per riga.
  const T_LENTE = 1.0;
  const T_RIGHE = 1.9;

  return (
    <section ref={ref} aria-labelledby="titolo-home" className="relative px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="hero-cornice relative isolate h-[calc(100svh-5.25rem)] min-h-[600px] overflow-hidden rounded-[22px] bg-[#1d1a15] sm:rounded-[28px] lg:max-h-[1000px]">
        {/* La foto, ridimensionata come object-fit: cover ma dentro un contenitore
            con le sue stesse proporzioni: cosi' la lente resta sul volto a ogni misura. */}
        <motion.div aria-hidden={!vetrina} style={{ y: yFoto }} className="absolute inset-0 [container-type:size]">
          <motion.div
            className="foto-cover absolute"
            initial={{ scale: ferma ? 1 : 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: ferma ? 0 : 2.8, ease: EASE }}
          >
            {vetrina && <picture>
              <source
                type="image/webp"
                srcSet="/home/scatto-gabriella-760.webp 760w, /home/scatto-gabriella-1200.webp 1200w, /home/scatto-gabriella-1536.webp 1536w"
                sizes="100vw"
              />
              <img
                src="/home/scatto-gabriella.jpg"
                alt={vetrina ? `${vetrina.nome} legge un libro al tavolino di un caffè in piazza: scatto certificato Semblic` : ""}
                width={1536}
                height={1024}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>}

            {/* La lente sul volto: angoli che si chiudono, una riga che scorre, poi il verde. */}
            {vetrina && (
              <motion.div
                aria-hidden
                className="absolute"
                style={{ left: `${VOLTO.left}%`, top: `${VOLTO.top}%`, width: `${VOLTO.width}%`, height: `${VOLTO.height}%` }}
                initial={ferma ? false : { opacity: 0, scale: 1.25 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: ferma ? 0 : T_LENTE, duration: 0.7, ease: EASE }}
              >
                {(["tl", "tr", "bl", "br"] as const).map((a) => (
                  <motion.span
                    key={a}
                    className={`lente-angolo lente-${a}`}
                    initial={ferma ? false : { borderColor: "rgba(255,255,255,0.95)" }}
                    animate={{ borderColor: ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.95)", "rgba(126,214,150,1)"] }}
                    transition={{ delay: ferma ? 0 : T_LENTE, duration: ferma ? 0 : 1.6, times: [0, 0.75, 1] }}
                  />
                ))}
                {!ferma && <span className="lente-riga" style={{ animationDelay: `${T_LENTE + 0.3}s` }} />}
                <motion.span
                  className="absolute -bottom-9 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#7ED696] px-3 py-1 text-[0.8rem] font-semibold text-[#0F2A17] shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
                  initial={ferma ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ferma ? 0 : T_LENTE + 1.4, duration: 0.5, ease: EASE }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> ha detto sì
                </motion.span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Velo per leggere il testo: scuro in basso a sinistra, la foto resta viva altrove. */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(16,13,9,0.88)_0%,rgba(16,13,9,0.45)_38%,rgba(16,13,9,0)_62%),linear-gradient(to_right,rgba(16,13,9,0.55)_0%,rgba(16,13,9,0)_55%)]" />

        {/* La verifica, riga per riga (in alto a destra sul computer). */}
        {vetrina && (
          <motion.div
            className="absolute right-4 top-4 hidden w-[340px] rounded-[18px] border border-white/20 bg-[rgba(20,17,12,0.42)] p-4 text-[#F6F1E7] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl md:block lg:right-7 lg:top-7"
            initial={ferma ? false : { opacity: 0, y: -12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: ferma ? 0 : T_RIGHE - 0.3, duration: 0.6, ease: EASE }}
          >
            <p className="flex items-center gap-2 text-[0.85rem] font-semibold text-white/80">
              <ScanFace className="h-4 w-4" strokeWidth={1.8} /> Verifica Semblic, prima di ogni scatto
            </p>
            <ul className="mt-3 grid gap-2.5">
              {righe.map((r, i) => (
                <motion.li
                  key={r}
                  className="flex items-center gap-2.5 text-[0.98rem]"
                  initial={ferma ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: ferma ? 0 : T_RIGHE + i * 0.38, duration: 0.45, ease: EASE }}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#7ED696] text-[#0F2A17]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {r}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Titolo e porte, in basso a sinistra. */}
        <motion.div style={{ y: yTesto }} className="absolute inset-x-0 bottom-0 p-5 pb-6 sm:p-10 lg:p-14">
          <h1 id="titolo-home" className="titolo-hero text-[3.1rem] font-bold leading-[0.96] tracking-[-0.04em] text-[#FBF7EF] sm:text-[4.6rem] lg:text-[5.6rem]">
            {righeTitolo.map((riga, i) => (
              <span key={riga} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block whitespace-nowrap"
                  initial={ferma ? false : { y: "105%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: ferma ? 0 : 0.15 + i * 0.1, duration: 0.95, ease: EASE }}
                >
                  {riga}
                </motion.span>
                {i < righeTitolo.length - 1 && " "}
              </span>
            ))}
          </h1>
          <motion.p
            className="mt-4 max-w-[40ch] text-[1.08rem] leading-relaxed text-[#EAE3D6] sm:text-[1.3rem]"
            initial={ferma ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ferma ? 0 : 0.65, duration: 0.7, ease: EASE }}
          >
            Foto e video con persone vere che hanno detto sì.<span className="hidden sm:inline"> Ogni scatto è verificato, certificato, e paga chi ci mette la faccia.</span>
          </motion.p>
          <motion.div
            className="mt-7 flex flex-col gap-3 sm:flex-row"
            initial={ferma ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ferma ? 0 : 0.8, duration: 0.7, ease: EASE }}
          >
            <Magnetic strength={0.22} className="flex"><Link
              href="/match"
              className="group inline-flex w-full min-h-[58px] items-center whitespace-nowrap sm:w-auto justify-center gap-3 rounded-full bg-amber px-8 text-[1.08rem] font-semibold text-on-amber shadow-[0_12px_30px_-10px_rgba(226,154,46,0.7)] transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-amber-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
            >
              Crea con volti veri
              <span className="whitespace-nowrap rounded-full bg-black/10 px-2.5 py-0.5 text-[0.9rem] tabular-nums max-[400px]:hidden">da {euro(prezzoDaCent)}</span>
            </Link></Magnetic>
            <Magnetic strength={0.22} className="flex"><Link
              href="/entra"
              className="inline-flex w-full min-h-[58px] items-center justify-center rounded-full border border-white/35 sm:w-auto bg-white/10 px-8 text-[1.08rem] font-semibold text-white backdrop-blur-md transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
            >
              Metti il tuo volto
            </Link></Magnetic>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
