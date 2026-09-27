"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ──────────────────────────────────────────────────────────────────────────
// IL VOLTO CHE SI FORMA (27/9/2026, rifatto dopo "bello il concetto, ma fa
// cagare"). Niente griglia di quadretti e niente scontorno: migliaia di punti
// sparsi arrivano da un vortice e si posano sul ritratto; quando sono arrivati
// la foto vera, nitida, prende il loro posto. Col mouse o col dito la foto si
// sfalda di nuovo in punti: il volto esiste solo col suo si'.
//
// La scena si ferma con position: sticky (non con il blocco di GSAP): sul
// telefono lo scorrimento corre su un binario suo e il blocco in JavaScript
// arrivava in ritardo, la sezione tremava. GSAP qui legge solo quanto hai
// scorso. Il disegno gira solo quando la scena e' sullo schermo.
// ──────────────────────────────────────────────────────────────────────────

interface Punto { u: number; v: number; a0: number; d0: number; r: number; c: string; ritardo: number; ox: number; oy: number }

export function VoltoParticelle({ nome, colori, foto }: { nome: string; colori: string; foto: { src640: string; src400: string } }) {
  const radice = useRef<HTMLElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const cornice = useRef<HTMLDivElement>(null);
  const immagine = useRef<HTMLImageElement>(null);
  const stato = useRef({ progresso: 0, px: -9999, py: -9999, tocco: 0, toccoVerso: 0, visibile: false, fermo: false });

  useLayoutEffect(() => {
    const el = radice.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (s) => {
          stato.current.progresso = s.progress;
          el.style.setProperty("--p", s.progress.toFixed(3));
        },
      });
      return () => st.kill();
    }, el);
    mm.add("(prefers-reduced-motion: reduce)", () => {
      stato.current.fermo = true;
      stato.current.progresso = 1;
      el.style.setProperty("--p", "1");
    });
    return () => mm.revert();
  }, []);

  useEffect(() => {
    const cv = tela.current, box = cornice.current, img = immagine.current, el = radice.current;
    if (!cv || !box || !img || !el || stato.current.fermo) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const telefono = window.matchMedia("(max-width: 767px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, telefono ? 2 : 1.75);
    let punti: Punto[] = [];
    let w = 0, h = 0, fx = 0, fy = 0, fw = 0, fh = 0, raf = 0, vivo = true;

    const mappa = new Image();
    mappa.decoding = "async";
    mappa.src = colori;

    function misura() {
      const c = cv!.getBoundingClientRect();
      const f = box!.getBoundingClientRect();
      w = c.width; h = c.height;
      fx = f.left - c.left; fy = f.top - c.top; fw = f.width; fh = f.height;
      cv!.width = Math.round(w * dpr); cv!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function costruisci() {
      if (!mappa.naturalWidth) return;
      const mw = mappa.naturalWidth, mh = mappa.naturalHeight;
      const off = document.createElement("canvas");
      off.width = mw; off.height = mh;
      const o = off.getContext("2d", { willReadFrequently: true })!;
      o.drawImage(mappa, 0, 0);
      const dati = o.getImageData(0, 0, mw, mh).data;
      const quanti = telefono ? 3400 : 8200;
      // Il colore dello studio, letto sulla riga in alto: i punti del fondo si
      // tengono radi (12%), cosi' la sagoma di volto e capelli si legge.
      let fr = 0, fg = 0, fb = 0;
      for (let x = 0; x < mw; x++) { fr += dati[x * 4]; fg += dati[x * 4 + 1]; fb += dati[x * 4 + 2]; }
      fr /= mw; fg /= mw; fb /= mw;
      const schiarisci = (c: number, crema: number) => Math.round(c + (crema - c) * 0.2);
      punti = [];
      for (let tentativi = 0; punti.length < quanti && tentativi < quanti * 6; tentativi++) {
        // Punti sparsi a caso, non a griglia: niente effetto "pixel".
        const u = Math.random(), v = Math.random();
        const i = ((Math.min(mh - 1, (v * mh) | 0) * mw) + Math.min(mw - 1, (u * mw) | 0)) * 4;
        const eFondo = Math.abs(dati[i] - fr) + Math.abs(dati[i + 1] - fg) + Math.abs(dati[i + 2] - fb) < 48;
        if (eFondo && Math.random() > 0.12) continue;
        punti.push({
          u, v,
          a0: Math.random() * Math.PI * 2,
          d0: 0.6 + Math.random() * 0.9,
          r: (eFondo ? 0.7 : 1) * ((telefono ? 1.25 : 1.05) + Math.random() * (telefono ? 1.1 : 0.9)),
          // I capelli scuri, schiariti appena, restano visibili sul nero.
          c: `rgb(${schiarisci(dati[i], 244)},${schiarisci(dati[i + 1], 236)},${schiarisci(dati[i + 2], 224)})`,
          ritardo: Math.random() * 0.35,
          ox: 0, oy: 0,
        });
      }
    }

    const facile = (t: number) => 1 - Math.pow(1 - t, 3);
    const limita = (x: number) => Math.max(0, Math.min(1, x));

    function disegna() {
      if (!vivo) return;
      const s = stato.current;
      // Il tocco (mouse o dito) si accende e si spegne morbido.
      s.tocco += (s.toccoVerso - s.tocco) * 0.12;
      // La foto arriva quando i punti sono posati, e si sfalda se la tocchi.
      const fotoVis = limita((s.progresso - 0.72) / 0.18) * (1 - s.tocco * 0.92);
      img!.style.opacity = fotoVis.toFixed(3);
      ctx!.clearRect(0, 0, w, h);
      const cx = fx + fw / 2, cy = fy + fh / 2;
      const raggio = telefono ? 70 : 120;
      const alfaPunti = 1 - fotoVis * 0.96;
      if (alfaPunti > 0.02) {
        for (const p of punti) {
          const k = limita((s.progresso - p.ritardo * 0.55) / 0.62);
          const e = facile(k);
          const tx = fx + p.u * fw, ty = fy + p.v * fh;
          // Partenza: un vortice largo attorno alla cornice, che si stringe.
          const ang = p.a0 + (1 - e) * 2.4;
          const dist = (1 - e) * p.d0 * Math.max(w, h) * 0.55;
          let x = tx + (cx - tx) * (1 - e) * 0.35 + Math.cos(ang) * dist;
          let y = ty + (cy - ty) * (1 - e) * 0.35 + Math.sin(ang) * dist;
          const dx = x - s.px, dy = y - s.py, d2 = dx * dx + dy * dy;
          if (d2 < raggio * raggio) {
            const d = Math.sqrt(d2) || 1;
            const forza = (1 - d / raggio) * 30;
            p.ox += (dx / d) * forza * 0.3;
            p.oy += (dy / d) * forza * 0.3;
          }
          p.ox *= 0.9; p.oy *= 0.9;
          x += p.ox; y += p.oy;
          ctx!.globalAlpha = alfaPunti * (0.35 + e * 0.65);
          ctx!.fillStyle = p.c;
          ctx!.beginPath();
          ctx!.arc(x, y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }
      raf = s.visibile ? requestAnimationFrame(disegna) : 0;
    }

    const avvia = () => { misura(); costruisci(); if (!raf) raf = requestAnimationFrame(disegna); };
    mappa.onload = avvia;
    if (mappa.complete && mappa.naturalWidth) avvia();

    const io = new IntersectionObserver(([e]) => {
      stato.current.visibile = e.isIntersecting;
      if (e.isIntersecting && !raf) raf = requestAnimationFrame(disegna);
    });
    io.observe(el);

    const muovi = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect();
      stato.current.px = e.clientX - b.left; stato.current.py = e.clientY - b.top;
      const f = box.getBoundingClientRect();
      const dentro = e.clientX > f.left && e.clientX < f.right && e.clientY > f.top && e.clientY < f.bottom;
      stato.current.toccoVerso = dentro ? 1 : 0;
    };
    const esci = () => { stato.current.px = -9999; stato.current.py = -9999; stato.current.toccoVerso = 0; };
    cv.addEventListener("pointermove", muovi);
    cv.addEventListener("pointerdown", muovi);
    cv.addEventListener("pointerleave", esci);
    cv.addEventListener("pointerup", esci);
    cv.addEventListener("pointercancel", esci);
    const ro = new ResizeObserver(() => misura());
    ro.observe(cv);

    return () => {
      vivo = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      cv.removeEventListener("pointermove", muovi); cv.removeEventListener("pointerdown", muovi);
      cv.removeEventListener("pointerleave", esci); cv.removeEventListener("pointerup", esci); cv.removeEventListener("pointercancel", esci);
    };
  }, [colori]);

  return (
    <section ref={radice} aria-labelledby="titolo-volto" className="volto-scena relative h-[250svh] bg-[#110F0B] text-[#F4EEE3] motion-reduce:h-auto">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center gap-5 overflow-hidden px-5 pb-6 pt-[5rem] lg:flex-row lg:gap-20 lg:px-16 lg:pt-[5.5rem] motion-reduce:static motion-reduce:h-auto motion-reduce:py-24">
        {/* I punti volano su tutta la scena; la foto sta nella cornice. */}
        <canvas ref={tela} aria-hidden className="absolute inset-0 h-full w-full touch-pan-y motion-reduce:hidden" />
        <div ref={cornice} className="pointer-events-none relative aspect-[4/5] h-[min(46svh,100vw)] shrink-0 overflow-hidden rounded-[24px] lg:h-[min(72svh,56vw)]">
          <picture>
            <source type="image/webp" srcSet={`${foto.src400} 400w, ${foto.src640} 640w`} sizes="(min-width: 1024px) 40vw, 80vw" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={immagine}
              src={foto.src640}
              alt={`Ritratto di ${nome}, che si compone di punti mentre scorri`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0 motion-reduce:opacity-100"
            />
          </picture>
        </div>
        <div className="pointer-events-none relative max-w-[30rem] text-center lg:text-left">
          <p className="volto-prima text-[1rem] text-white/60 sm:text-[1.05rem]">Senza consenso, nessun volto.</p>
          <h2 id="titolo-volto" className="mt-1.5 text-[2rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[3rem] lg:text-[4rem]">
            Con il suo sì, {nome} prende forma.
          </h2>
          <p className="volto-dopo mt-3 text-[1rem] text-white/75 sm:text-[1.2rem]">
            Toccala e torna punti. Si ricompone solo col suo sì, e ogni volta che viene usata, viene pagata.
          </p>
        </div>
      </div>
    </section>
  );
}
