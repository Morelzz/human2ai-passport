"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";

// ──────────────────────────────────────────────────────────────────────────
// I SOGGETTI ANIMATI, SPIEGATI SEMPLICE (1/10/2026, richiesta di Morelz).
// Un solo gesto: tocchi "Si muove" e la persona della foto prende vita per
// cinque secondi. Sotto, sei fotogrammi del clip, ognuno col suo segno di
// controllato. Il messaggio e' uno: il sì vale anche per il video, e il video
// non e' un'invenzione, e' lei. Il clip e' lo stesso della scheda Anima
// (Gabriella, 5 s, muto); i sei fotogrammi sono presi da quel clip.
// Con "riduci animazioni" non parte da solo e resta il fermo immagine.
// ──────────────────────────────────────────────────────────────────────────

const VIDEO = "/home/anima-gabriella.mp4"; // dal sito, non dal bucket (vedi HeroCinema)
const POSTER = "/home/anima-f0.webp";

export function SoggettiAnimati({ nome }: { nome: string }) {
  const ferma = useReducedMotionSafe();
  const [modo, setModo] = useState<"foto" | "video">("foto");
  const vetrina = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const toccato = useRef(false);

  // Il video si accende da solo una volta, quando la scheda e' ben visibile.
  useEffect(() => {
    const el = vetrina.current;
    if (!el || ferma) return;
    let t: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !toccato.current) {
          t = setTimeout(() => { if (!toccato.current) setModo("video"); }, 900);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [ferma]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (modo === "video") {
      if (!v.src) v.src = VIDEO;
      v.currentTime = 0;
      v.play().catch(() => {});
    } else v.pause();
  }, [modo]);

  const scegli = (m: "foto" | "video") => { toccato.current = true; setModo(m); };

  return (
    <section aria-labelledby="titolo-animati" className="mx-auto max-w-[1380px] px-3 py-10 sm:px-5 sm:py-14">
      <div data-theme="dark" className="isola grid gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:px-16">
        <div>
          <h2 id="titolo-animati" className="max-w-[14ch] text-[2.1rem] font-bold leading-[1] tracking-[-0.045em] sm:text-[3.3rem]">Lo scatto si muove. Lei resta lei.</h2>
          <p className="mt-5 max-w-[44ch] text-[1.06rem] leading-relaxed text-muted">
            Da uno scatto certificato, cinque o dieci secondi di video. La persona ha detto sì anche al video, e il suo volto viene misurato fotogramma per fotogramma.
          </p>
          <ul className="mt-6 grid gap-2.5">
            {["Mai audio, mai parole messe in bocca.", "Un fotogramma che non tiene non arriva a te.", "La persona è pagata anche per il video."].map((t) => (
              <li key={t} className="flex items-baseline gap-3 text-[0.98rem] text-foreground">
                <i aria-hidden className="h-[7px] w-[7px] shrink-0 -translate-y-[2px] rounded-full bg-verified" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-[440px] lg:ml-auto">
          <div role="group" aria-label="Foto o video" className="mb-4 inline-flex rounded-full bg-[rgba(255,255,255,0.08)] p-1">
            {([["foto", "Foto"], ["video", "Si muove"]] as const).map(([m, l]) => (
              <button
                key={m}
                type="button"
                aria-pressed={modo === m}
                onClick={() => scegli(m)}
                className={`relative h-9 rounded-full px-5 text-[0.9rem] font-semibold transition-colors duration-300 ${modo === m ? "text-[#17150F]" : "text-muted hover:text-foreground"}`}
              >
                {modo === m && <motion.span layoutId="animati-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-[#F7F4EE]" />}
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>

          <div ref={vetrina} className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#2a2620]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POSTER} alt={`${nome}, scatto fermo`} width={540} height={810} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_12%]" />
            <video
              ref={video}
              poster={POSTER}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
              className={`absolute inset-0 h-full w-full object-cover object-[50%_12%] transition-opacity duration-700 ${modo === "video" ? "opacity-100" : "opacity-0"}`}
            />
          </div>

          <div className="mt-3 grid grid-cols-6 gap-1.5" aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative aspect-[2/3] overflow-hidden rounded-[9px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/home/anima-f${i}.webp`} alt="" width={90} height={135} loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_15%]" />
                <span className="absolute bottom-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-[#3DDC97] text-[#0F2A17]"><Check className="h-2.5 w-2.5" strokeWidth={3.4} /></span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.8rem] leading-snug text-muted">Sei fotogrammi del clip, ognuno controllato.</p>
        </div>
      </div>
    </section>
  );
}
