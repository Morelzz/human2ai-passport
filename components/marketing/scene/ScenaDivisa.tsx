"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScattoVetrina } from "@/lib/vetrina";

gsap.registerPlugin(ScrollTrigger);
// Sul telefono la barra degli indirizzi che sparisce non deve far saltare le scene.
ScrollTrigger.config({ ignoreMobileResize: true });

// ──────────────────────────────────────────────────────────────────────────
// SCENA 1, LA FOTO CHE SI DIVIDE (27/9/2026). Sul computer la sezione si ferma
// e, mentre scorri, lo scatto di Gabriella si apre in due meta' che si
// allontanano: a sinistra resta quello che paga chi lo crea, a destra quello
// che riceve lei. "Una foto, due persone" detto con la foto stessa.
// Anche sul telefono (27/9, "gli effetti fighi anche su mobile"): li' la frase
// sta in alto e le due schede affiancate in basso. Con "riduci animazioni"
// resta DuePorte, ferma.
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export function ScenaDivisa({ vetrina }: { vetrina: ScattoVetrina }) {
  const radice = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = radice.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ computer: "(min-width: 1024px)", telefono: "(max-width: 1023px)", muovi: "(prefers-reduced-motion: no-preference)" }, (c) => {
      const { computer, muovi } = c.conditions as { computer: boolean; muovi: boolean };
      if (!muovi) return;
      const apri = computer ? 58 : 16;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        // Niente pin di GSAP: la scena si ferma con position: sticky (sotto),
        // che il telefono gestisce senza ritardi. Qui si legge solo lo scorrimento.
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.fromTo(".sd-foto", { scale: 1.08 }, { scale: 1, duration: 0.25 }, 0)
        .fromTo(".sd-meta-s", { xPercent: 0, rotate: 0 }, { xPercent: -apri, rotate: computer ? -3 : -2, duration: 0.5 }, 0.2)
        .fromTo(".sd-meta-d", { xPercent: 0, rotate: 0 }, { xPercent: apri, rotate: computer ? 3 : 2, duration: 0.5 }, 0.2)
        .fromTo(".sd-centro", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.45)
        .fromTo(".sd-scheda-s", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.6)
        .fromTo(".sd-scheda-d", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.68)
        .to({}, { duration: 0.2 });
      return () => tl.scrollTrigger?.kill();
    }, el);
    return () => mm.revert();
  }, []);

  return (
    <section ref={radice} aria-labelledby="titolo-divisa" className="relative h-[230svh] motion-reduce:hidden lg:h-[270svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
      <div className="sd-foto absolute inset-0 flex items-center justify-center pb-[19svh] pt-[16svh] lg:pb-0 lg:pt-[4.75rem]">
        <div className="relative flex h-[min(38svh,61vw)] w-[min(92vw,57svh)] lg:h-[min(62vh,40vw)] lg:w-[min(93vh,60vw)]">
          {(["s", "d"] as const).map((lato) => (
            <div key={lato} className={`sd-meta-${lato} relative h-full w-1/2 overflow-hidden ${lato === "s" ? "rounded-l-[26px]" : "rounded-r-[26px]"} shadow-[0_40px_80px_-40px_rgba(23,21,15,0.55)]`}>
              <picture>
                <source type="image/webp" srcSet="/home/scatto-gabriella-1200.webp 1200w, /home/scatto-gabriella-1536.webp 1536w" sizes="60vw" />
                <img
                  src="/home/scatto-gabriella.jpg"
                  alt={lato === "s" ? `${vetrina.nome} al caffè, la metà di chi crea lo scatto` : ""}
                  aria-hidden={lato === "d"}
                  loading="lazy"
                  decoding="async"
                  className={`absolute top-0 h-full w-[200%] max-w-none object-cover ${lato === "s" ? "left-0" : "-left-full"}`}
                />
              </picture>
              {/* La scheda di ciascuna meta', attaccata sotto. */}
              <div className={`sd-scheda-${lato} invisible absolute inset-x-4 bottom-4 hidden lg:block rounded-[18px] p-5 backdrop-blur-xl ${lato === "s" ? "bg-white/90 text-[#17150F]" : "bg-[rgba(23,21,15,0.72)] text-[#F7F4EE]"}`}>
                {lato === "s" ? (
                  <>
                    <p className="text-[0.95rem] opacity-70">Chi lo crea paga</p>
                    <p className="text-[2.6rem] font-semibold leading-none tracking-[-0.03em] tabular-nums">{euro(vetrina.prezzoCent)}</p>
                    <Link href="/match" className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber font-semibold text-on-amber transition-colors hover:bg-amber-hover">
                      Crea con volti veri
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[0.95rem] opacity-75">{vetrina.nome} riceve</p>
                    <p className="text-[2.6rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#9BE3AE]">{euro(vetrina.allaPersonaCent)}</p>
                    <Link href="/entra" className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#F7F4EE] font-semibold text-[#17150F] transition-transform hover:-translate-y-px">
                      Metti il tuo volto
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telefono: le due schede affiancate in basso. */}
      <div className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 lg:hidden">
        <div className="sd-scheda-s invisible rounded-[18px] bg-white p-4 text-[#17150F] shadow-[0_20px_40px_-24px_rgba(23,21,15,0.5)]">
          <p className="text-[0.85rem] opacity-70">Chi lo crea paga</p>
          <p className="text-[1.9rem] font-semibold leading-none tracking-[-0.03em] tabular-nums">{euro(vetrina.prezzoCent)}</p>
          <Link href="/match" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-amber text-[0.92rem] font-semibold text-on-amber">Crea</Link>
        </div>
        <div className="sd-scheda-d invisible rounded-[18px] bg-[#17150F] p-4 text-[#F7F4EE] shadow-[0_20px_40px_-24px_rgba(23,21,15,0.5)]">
          <p className="text-[0.85rem] opacity-75">{vetrina.nome} riceve</p>
          <p className="text-[1.9rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#9BE3AE]">{euro(vetrina.allaPersonaCent)}</p>
          <Link href="/entra" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#F7F4EE] text-[0.92rem] font-semibold text-[#17150F]">Metti il volto</Link>
        </div>
      </div>

      {/* Telefono: la frase in alto. Computer: nel varco fra le due meta'. */}
      <div className="sd-centro pointer-events-none invisible absolute inset-x-0 top-[calc(4.75rem+1svh)] flex justify-center px-6 lg:inset-0 lg:top-0 lg:items-center lg:px-0">
        <div className="text-center lg:w-[min(30vw,420px)]">
          <h2 id="titolo-divisa" className="text-[1.9rem] font-bold leading-[0.98] tracking-[-0.04em] lg:text-[3.1rem]">Una foto, due persone contente.</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[0.95rem] text-muted lg:mt-4 lg:text-[1.05rem]">Revoca quando vuole, vale subito. Decide lei a cosa dice no.</p>
        </div>
      </div>
      </div>
    </section>
  );
}
