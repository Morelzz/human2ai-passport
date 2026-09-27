"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ──────────────────────────────────────────────────────────────────────────
// SCENA 4, COME FUNZIONA A CARTE IMPILATE (27/9/2026). Ogni passaggio e' una
// carta che si ferma in alto (sticky, anche sul telefono) e la successiva le
// sale sopra; quella sotto si rimpicciolisce e si scurisce un poco (scrub).
// Il testo e' quello del flusso vero: consenso, regole, verifica, compenso.
// ──────────────────────────────────────────────────────────────────────────

const PASSI = [
  { t: "Scegli un volto vero.", d: "Solo persone che hanno verificato l'identità e detto sì. Nessun volto inventato, nessun volto rubato.", fondo: "bg-surface", testo: "text-foreground" },
  { t: "Scrivi la scena.", d: "Prima di spendere un centesimo, Semblic la legge contro i limiti che la persona ha scritto con parole sue. Se non va, non parte.", fondo: "bg-[var(--pannello-persona)]", testo: "text-foreground" },
  { t: "Lo scatto viene controllato.", d: "Il volto si misura sul risultato e un secondo occhio guarda la qualità. Se non tiene, non lo paghi.", fondo: "bg-amber-soft", testo: "text-foreground" },
  { t: "Certificato, e la persona è pagata.", d: "Filigrana invisibile, certificato pubblico su Sigil, e la sua parte a ogni scatto. Revoca quando vuole.", fondo: "bg-[#17150F]", testo: "text-[#F7F4EE]" },
];

export function PassiImpilati() {
  const radice = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = radice.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const carte = gsap.utils.toArray<HTMLElement>(".pi-carta");
      const tws = carte.slice(0, -1).map((c, i) =>
        // Da "brightness(1)" esplicito: partendo da "none" GSAP passava per il nero.
        gsap.fromTo(c, { scale: 1, filter: "brightness(1)" }, {
          scale: 0.92,
          filter: "brightness(0.9)",
          ease: "none",
          scrollTrigger: { trigger: carte[i + 1], start: "top bottom", end: "top 18%", scrub: true },
        }),
      );
      return () => tws.forEach((t) => t.scrollTrigger?.kill());
    }, el);
    return () => mm.revert();
  }, []);

  return (
    <section ref={radice} aria-labelledby="titolo-passi" className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-8">
      <h2 id="titolo-passi" className="mb-10 text-[2.4rem] font-bold leading-none tracking-[-0.04em] sm:text-[3.4rem] lg:text-[4.2rem]">Come funziona.</h2>
      <ol className="grid gap-6">
        {PASSI.map((p, i) => (
          <li
            key={p.t}
            className={`pi-carta sticky origin-top rounded-[28px] border border-border p-7 shadow-[0_30px_60px_-40px_rgba(23,21,15,0.45)] sm:p-12 ${p.fondo} ${p.testo}`}
            style={{ top: `calc(5.5rem + ${i * 18}px)` }}
          >
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-12">
              <p className="text-[4.5rem] font-bold leading-none tracking-[-0.05em] opacity-20 tabular-nums sm:text-[7rem]">{i + 1}</p>
              <div>
                <h3 className="text-[1.9rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[2.8rem]">{p.t}</h3>
                <p className="mt-3 max-w-[46ch] text-[1.08rem] leading-relaxed opacity-80 sm:text-[1.2rem]">{p.d}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
