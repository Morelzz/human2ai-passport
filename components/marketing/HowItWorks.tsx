"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, Search, Coins } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

// Gradiente tramonto periodico (amber ai due estremi) per un loop senza scatti,
// usato animato sul titolo. Inline nel componente: niente dipendenze CSS globali.
const FLOW_BG = "linear-gradient(110deg,#F2A93B,#EE7A70,#F2A93B)";

// [COME FUNZIONA] — Tre passi, dopo il manifesto. Copy verbatim da
// docs/SITE_COPY.md. I motori (Higgsfield/HeyGen) restano invisibili.
//
// ONDATA GSAP (richiesta Morelz): su desktop la sezione si BLOCCA (pin) e i
// tre passi avanzano legati allo scroll (scrub) con una linea di progresso
// che attraversa i colori semantici dei passi (viola -> crimson -> teal).
// Su mobile: fade-up leggero senza pin. Con prefers-reduced-motion: statico.

const STEPS = [
  {
    n: "01",
    t: "Una persona reale entra.",
    d: "Viene verificata, firma il proprio consenso e sceglie dove la sua immagine può vivere.",
    Icon: ShieldCheck,
    color: "text-violet",
    ring: "border-violet/40 bg-violet/10",
  },
  {
    n: "02",
    t: "Una richiesta arriva.",
    d: "Il sistema cerca una persona reale che ha acconsentito. Se non la trova, non genera. Punto.",
    Icon: Search,
    color: "text-crimson",
    ring: "border-crimson/40 bg-crimson/10",
  },
  {
    n: "03",
    t: "Il valore torna alla persona.",
    d: "A ogni utilizzo, chi ha messo il volto guadagna. Il valore creato dall'AI torna all'essere umano da cui nasce.",
    Icon: Coins,
    color: "text-teal",
    ring: "border-teal/40 bg-teal/10",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop: sezione pinnata, i passi entrano in sequenza legati allo scroll.
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-step]");
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=200%",
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
          },
        });
        tl.fromTo("[data-progress]", { scaleX: 0 }, { scaleX: 1, duration: 3, ease: "none" }, 0);
        cards.forEach((el, i) => {
          tl.fromTo(
            el,
            { autoAlpha: 0, y: 90, rotateX: 9, scale: 0.96 },
            { autoAlpha: 1, y: 0, rotateX: 0, scale: 1, duration: 0.75, ease: "power2.out" },
            i * 0.95 + 0.12
          );
        });
      });

      // Mobile (movimento ok): fade-up senza pin, una volta sola.
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 26 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }
          );
        });
      });
      // prefers-reduced-motion: nessuna media query attiva -> tutto statico e visibile.
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="come-funziona"
      className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:py-0"
    >
      <div className="text-center">
        <span className="label-mono text-violet-light">In tre passi</span>
        <h2 className="mt-3 text-4xl font-bold uppercase tracking-[-0.02em] sm:text-6xl">
          <motion.span
            className="inline-block"
            style={{
              backgroundImage: FLOW_BG,
              backgroundSize: "200% auto",
              backgroundPosition: "0% center",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
            animate={reduce ? undefined : { backgroundPosition: ["0% center", "-200% center"] }}
            transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: "linear" }}
          >
            Come funziona
          </motion.span>
        </h2>
      </div>

      {/* Linea di progresso: i colori dei tre passi (semantica, non decorazione) */}
      <div className="mx-auto mt-8 hidden h-px w-full max-w-3xl overflow-hidden rounded-full bg-white/8 lg:block">
        <div
          data-progress
          className="h-full w-full origin-left"
          style={{ background: "linear-gradient(90deg, #F2A93B 0%, var(--blocked-c) 50%, var(--verified-c) 100%)", transform: "scaleX(0)" }}
        />
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:[perspective:1100px]">
        {STEPS.map((s) => (
          <div key={s.n} data-step className="glass glass-hover rounded-2xl p-6 lg:[transform-style:preserve-3d]">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${s.ring}`}>
              <s.Icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className={`text-xs font-extrabold tracking-widest ${s.color}`}>{s.n}</span>
              <h3 className="text-lg font-bold">{s.t}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
