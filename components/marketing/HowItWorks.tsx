"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionTitle } from "@/components/marketing/SectionTitle";

gsap.registerPlugin(ScrollTrigger);

// [COME FUNZIONA], casa nuova: tre card chiare, numerate perche' l'ordine e'
// un processo vero (persona, filtro, valore). Copy verbatim da SITE_COPY.
// Su desktop la sezione resta pinnata e i passi entrano legati allo scroll,
// con la linea di avanzamento nei colori semantici; su mobile fade-up leggero;
// con prefers-reduced-motion tutto statico.

const STEPS = [
  { n: "01", k: "La persona", t: "Una persona reale entra.", d: "Viene verificata, firma il proprio consenso e sceglie dove la sua immagine puo' vivere." },
  { n: "02", k: "Il filtro", t: "Una richiesta arriva.", d: "Il sistema cerca una persona reale che ha acconsentito. Se non la trova, non genera. Punto." },
  { n: "03", k: "Il valore", t: "Il valore torna alla persona.", d: "A ogni utilizzo, chi ha messo il volto guadagna. Il valore creato dall'AI torna all'essere umano da cui nasce." },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-step]");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "+=160%", pin: true, scrub: 0.5, anticipatePin: 1 },
        });
        tl.fromTo("[data-progress]", { scaleX: 0 }, { scaleX: 1, duration: 3, ease: "none" }, 0);
        cards.forEach((el, i) => {
          tl.fromTo(el, { autoAlpha: 0, y: 60, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.75, ease: "power2.out" }, i * 0.95 + 0.12);
        });
      });
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el) => {
          gsap.fromTo(el, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="come-funziona"
      className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-20 sm:px-8 sm:pt-24 lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:pt-0"
    >
      <SectionTitle kicker="In tre passi">Come funziona</SectionTitle>

      {/* Linea di avanzamento: i colori dei tre passi (semantica, non decorazione) */}
      <div className="mb-8 hidden h-px w-full max-w-3xl overflow-hidden rounded-full bg-border lg:block">
        <div
          data-progress
          className="h-full w-full origin-left"
          style={{ background: "linear-gradient(90deg, var(--amber-c) 0%, var(--blocked-c) 50%, var(--verified-c) 100%)", transform: "scaleX(0)" }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} data-step className="card flex flex-col gap-3.5 p-6 sm:p-7">
            <span className="kicker self-start rounded-full bg-amber-soft px-2.5 py-1.5 text-[0.62rem]">{s.n} · {s.k}</span>
            <h3 className="text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">{s.t}</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
