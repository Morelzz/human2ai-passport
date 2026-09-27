"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ──────────────────────────────────────────────────────────────────────────
// SCENA 2, LA FRASE CHE SI ACCENDE (27/9/2026). Una frase grande che si
// accende parola per parola mentre scorri, legata al pollice (scrub): si
// legge al ritmo di chi scorre. Le parole chiave diventano ambra.
// Senza animazioni la frase e' gia' tutta accesa.
// ──────────────────────────────────────────────────────────────────────────

const FRASE = "Nessuna AI genera un essere umano senza il suo sì. E chi dice sì viene pagato, ogni volta.";
const CHIAVI = new Set(["sì.", "sì", "pagato,"]);

export function FraseAccesa() {
  const radice = useRef<HTMLElement>(null);

  // Una volta per pagina: quando caratteri e immagini hanno finito di
  // caricare le altezze cambiano, e tutte le scene ricalcolano dove partono.
  useEffect(() => {
    const rifai = () => ScrollTrigger.refresh();
    window.addEventListener("load", rifai);
    document.fonts?.ready.then(rifai).catch(() => {});
    return () => window.removeEventListener("load", rifai);
  }, []);

  useLayoutEffect(() => {
    const el = radice.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const parole = el.querySelectorAll<HTMLElement>(".fa-parola");
      const tw = gsap.fromTo(
        parole,
        { opacity: 0.14, filter: "blur(3px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 45%", scrub: 0.6 },
        },
      );
      return () => tw.scrollTrigger?.kill();
    }, el);
    return () => mm.revert();
  }, []);

  return (
    <section ref={radice} className="mx-auto max-w-[1180px] px-5 py-28 sm:px-8 sm:py-40">
      <p className="text-balance text-[2.3rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[3.6rem] lg:text-[4.6rem]">
        {FRASE.split(" ").map((p, i) => (
          <span key={i} className={`fa-parola inline-block ${CHIAVI.has(p) ? "text-amber-ink" : ""}`}>
            {p}
            {" "}
          </span>
        ))}
      </p>
    </section>
  );
}
