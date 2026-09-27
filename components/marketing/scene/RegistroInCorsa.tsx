"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ──────────────────────────────────────────────────────────────────────────
// SCENA 3, IL REGISTRO CHE SCORRE DI LATO (27/9/2026). Sul computer la sezione
// si ferma e i volti veri del registro passano in orizzontale mentre scorri in
// verticale; ogni ritratto si muove un filo dentro la sua cornice (parallasse)
// e porta il suo stato di consenso. Sul telefono la stessa fila scorre col dito.
// ──────────────────────────────────────────────────────────────────────────

export interface VoltoInCorsa {
  handle: string;
  alias: string;
  src: string;
  utilizzi: number;
}

export function RegistroInCorsa({ volti, totale }: { volti: VoltoInCorsa[]; totale: number }) {
  const radice = useRef<HTMLElement>(null);
  const pista = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = radice.current;
    const tr = pista.current;
    if (!el || !tr) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const distanza = () => tr.scrollWidth - window.innerWidth + 64;
      const tw = gsap.to(tr, {
        x: () => -distanza(),
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: () => `+=${distanza()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      const foto = gsap.utils.toArray<HTMLElement>(".rc-foto");
      const px = foto.map((f) =>
        gsap.fromTo(f, { xPercent: -8 }, { xPercent: 8, ease: "none", scrollTrigger: { trigger: f, containerAnimation: tw, start: "left right", end: "right left", scrub: true } }),
      );
      return () => { tw.scrollTrigger?.kill(); px.forEach((p) => p.scrollTrigger?.kill()); };
    }, el);
    return () => mm.revert();
  }, []);

  return (
    <section ref={radice} aria-labelledby="titolo-registro" className="relative overflow-hidden py-16 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center lg:py-0">
      <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="titolo-registro" className="text-[2.4rem] font-bold leading-none tracking-[-0.04em] sm:text-[3.4rem] lg:text-[4.2rem]">
            Persone, non prompt.
          </h2>
          <Link href="/catalogo" className="inline-flex min-h-[48px] items-center rounded-full border border-edge px-6 font-semibold transition-colors hover:border-amber">
            Tutti i {totale} volti
          </Link>
        </div>
        <p className="mt-3 max-w-[52ch] text-[1.1rem] text-muted">Ognuno ha verificato la sua identità e ha detto sì. Ogni immagine qui è generata da Semblic con il suo consenso.</p>
      </div>

      <div
        ref={pista}
        className="mt-10 flex gap-5 px-5 max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto sm:px-8 lg:mt-12 lg:w-max lg:gap-7 lg:pl-[max(2rem,calc((100vw-1380px)/2+2rem))]"
      >
        {volti.map((v) => (
          <Link
            key={v.handle}
            href={`/passport/${v.handle}`}
            className="group relative block w-[72vw] shrink-0 snap-start sm:w-[42vw] lg:w-[340px]"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] bg-[var(--hairline-soft)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.src}
                alt={`${v.alias}, volto del registro`}
                // La fila si sposta di lato con una trasformazione: il caricamento
                // pigro non se ne accorge e lasciava i riquadri vuoti. Si caricano
                // subito, con priorita' bassa (sotto il primo schermo).
                loading="eager"
                fetchPriority="low"
                decoding="async"
                className="rc-foto absolute inset-y-0 -left-[8%] h-full w-[116%] max-w-none object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 text-[0.85rem] font-semibold text-[var(--on-consenso-pill)]">
                <i aria-hidden className="h-2 w-2 rounded-full bg-[#2E9E44]" /> consenso attivo
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-[1.35rem] font-semibold tracking-[-0.02em]">{v.alias}</span>
              <span className="text-[0.95rem] text-muted tabular-nums">{v.utilizzi === 1 ? "scelta 1 volta" : `scelta ${v.utilizzi} volte`}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
