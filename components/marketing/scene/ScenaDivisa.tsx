"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScattoVetrina } from "@/lib/vetrina";

gsap.registerPlugin(ScrollTrigger);

// ──────────────────────────────────────────────────────────────────────────
// SCENA 1, LA FOTO CHE SI DIVIDE (27/9/2026). Sul computer la sezione si ferma
// e, mentre scorri, lo scatto di Gabriella si apre in due meta' che si
// allontanano: a sinistra resta quello che paga chi lo crea, a destra quello
// che riceve lei. "Una foto, due persone" detto con la foto stessa.
// Solo computer e senza "riduci animazioni": altrimenti DuePorte (telefono).
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export function ScenaDivisa({ vetrina }: { vetrina: ScattoVetrina }) {
  const radice = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = radice.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "+=170%", pin: true, scrub: 0.8, anticipatePin: 1 },
      });
      tl.fromTo(".sd-foto", { scale: 1.08 }, { scale: 1, duration: 0.25 }, 0)
        .fromTo(".sd-meta-s", { xPercent: 0, rotate: 0 }, { xPercent: -58, rotate: -3, duration: 0.5 }, 0.2)
        .fromTo(".sd-meta-d", { xPercent: 0, rotate: 0 }, { xPercent: 58, rotate: 3, duration: 0.5 }, 0.2)
        .fromTo(".sd-centro", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.45)
        .fromTo(".sd-scheda-s", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.6)
        .fromTo(".sd-scheda-d", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.68)
        .to({}, { duration: 0.2 });
      return () => tl.scrollTrigger?.kill();
    }, el);
    return () => mm.revert();
  }, []);

  return (
    <section ref={radice} aria-labelledby="titolo-divisa" className="relative hidden h-[100svh] overflow-hidden lg:block motion-reduce:lg:hidden">
      <div className="sd-foto absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-[min(62vh,40vw)] w-[min(93vh,60vw)]">
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
              <div className={`sd-scheda-${lato} invisible absolute inset-x-4 bottom-4 rounded-[18px] p-5 backdrop-blur-xl ${lato === "s" ? "bg-white/90 text-[#17150F]" : "bg-[rgba(23,21,15,0.72)] text-[#F7F4EE]"}`}>
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

      {/* Nel varco fra le due meta'. */}
      <div className="sd-centro pointer-events-none invisible absolute inset-0 flex items-center justify-center">
        <div className="w-[min(30vw,420px)] text-center">
          <h2 id="titolo-divisa" className="text-[3.1rem] font-bold leading-[0.98] tracking-[-0.04em]">Una foto, due persone contente.</h2>
          <p className="mx-auto mt-4 max-w-[300px] text-[1.05rem] text-muted">Revoca quando vuole, vale subito. Decide lei a cosa dice no.</p>
        </div>
      </div>
    </section>
  );
}
