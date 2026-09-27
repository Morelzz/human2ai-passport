"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ──────────────────────────────────────────────────────────────────────────
// SCENA 0, IL VOLTO DI PUNTI (27/9/2026, "manca qualcosa di assurdo"). Il
// ritratto vero di Gabriella fatto di migliaia di punti. La sezione si ferma e,
// mentre scorri, i punti sparsi si ricompongono nel suo volto: senza consenso
// non c'e' volto, con il suo si' prende forma. Col mouse o col dito i punti
// scappano e poi tornano. Canvas 2D, niente librerie in piu'.
//
// Regole: il disegno gira solo quando la sezione e' sullo schermo; densita'
// ridotta sul telefono; con "riduci animazioni" il volto e' gia' composto e fermo.
// ──────────────────────────────────────────────────────────────────────────

interface Punto { tx: number; ty: number; sx: number; sy: number; r: number; c: string; ritardo: number; ox: number; oy: number }



export function VoltoParticelle({ nome, mappa }: { nome: string; mappa: string }) {
  const radice = useRef<HTMLElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const stato = useRef({ progresso: 0, px: -9999, py: -9999, visibile: false, fermo: false });

  // Scorrimento: la sezione si ferma e il progresso va da 0 a 1.
  useLayoutEffect(() => {
    const el = radice.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=140%",
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        onUpdate: (s) => {
          stato.current.progresso = s.progress;
          el.style.setProperty("--p", String(s.progress));
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

  // Disegno.
  useEffect(() => {
    const cv = tela.current;
    const el = radice.current;
    if (!cv || !el) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let punti: Punto[] = [];
    let w = 0, h = 0, raf = 0, vivo = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const telefono = window.matchMedia("(max-width: 767px)").matches;

    const img = new Image();
    img.decoding = "async";
    img.src = mappa;

    function costruisci() {
      const box = cv!.getBoundingClientRect();
      w = box.width; h = box.height;
      cv!.width = Math.round(w * dpr); cv!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!img.complete || !img.naturalWidth) return;
      // La mappa e' gia' pronta (scripts/volto-punti.mjs): una cella = un punto,
      // fondo trasparente. Sul telefono un punto su quattro, piu' grande.
      const salto = telefono ? 2 : 1;
      const colonne = img.naturalWidth, righe = img.naturalHeight;
      const off = document.createElement("canvas");
      off.width = colonne; off.height = righe;
      const o = off.getContext("2d", { willReadFrequently: true })!;
      o.drawImage(img, 0, 0);
      const dati = o.getImageData(0, 0, colonne, righe).data;
      const passo = Math.min(w / colonne, h / righe);
      const x0 = (w - colonne * passo) / 2, y0 = (h - righe * passo) / 2;
      punti = [];
      for (let y = 0; y < righe; y += salto) {
        for (let x = 0; x < colonne; x += salto) {
          const i = (y * colonne + x) * 4;
          if (dati[i + 3] < 128) continue;
          // Un filo di crema su ogni punto: i capelli scuri restano leggibili sul nero.
          const schiarisci = (v: number, crema: number) => Math.round(v + (crema - v) * 0.16);
          const r = schiarisci(dati[i], 244), g = schiarisci(dati[i + 1], 238), b = schiarisci(dati[i + 2], 227);
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.max(w, h) * (0.55 + Math.random() * 0.5);
          punti.push({
            tx: x0 + (x + salto / 2) * passo,
            ty: y0 + (y + salto / 2) * passo,
            sx: w / 2 + Math.cos(ang) * dist,
            sy: h / 2 + Math.sin(ang) * dist,
            r: passo * salto * (0.3 + (1 - lum) * 0.22),
            c: `rgb(${r},${g},${b})`,
            ritardo: Math.random() * 0.45 + (y / righe) * 0.2,
            ox: 0, oy: 0,
          });
        }
      }
    }

    const facile = (t: number) => 1 - Math.pow(1 - t, 3);
    function disegna() {
      if (!vivo) return;
      const s = stato.current;
      ctx!.clearRect(0, 0, w, h);
      const raggio = telefono ? 60 : 110;
      for (const p of punti) {
        const k = Math.min(1, Math.max(0, (s.progresso - p.ritardo * 0.6) / 0.55));
        const e = s.fermo ? 1 : facile(k);
        let x = p.sx + (p.tx - p.sx) * e;
        let y = p.sy + (p.ty - p.sy) * e;
        // Il mouse o il dito spinge via i punti vicini; poi tornano con una molla.
        const dx = x - s.px, dy = y - s.py;
        const d2 = dx * dx + dy * dy;
        if (d2 < raggio * raggio && !s.fermo) {
          const d = Math.sqrt(d2) || 1;
          const forza = (1 - d / raggio) * 26;
          p.ox += (dx / d) * forza * 0.35;
          p.oy += (dy / d) * forza * 0.35;
        }
        p.ox *= 0.9; p.oy *= 0.9;
        x += p.ox; y += p.oy;
        ctx!.globalAlpha = 0.25 + e * 0.75;
        ctx!.fillStyle = p.c;
        ctx!.beginPath();
        ctx!.arc(x, y, p.r * (0.6 + e * 0.4), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = s.visibile && !s.fermo ? requestAnimationFrame(disegna) : 0;
    }

    img.onload = () => { costruisci(); disegna(); };
    if (img.complete) { costruisci(); disegna(); }

    const io = new IntersectionObserver(([e]) => {
      stato.current.visibile = e.isIntersecting;
      if (e.isIntersecting && !raf) raf = requestAnimationFrame(disegna);
    });
    io.observe(el);

    const muovi = (cx: number, cy: number) => {
      const b = cv.getBoundingClientRect();
      stato.current.px = cx - b.left; stato.current.py = cy - b.top;
    };
    const suMouse = (e: PointerEvent) => muovi(e.clientX, e.clientY);
    const esci = () => { stato.current.px = -9999; stato.current.py = -9999; };
    cv.addEventListener("pointermove", suMouse);
    cv.addEventListener("pointerdown", suMouse);
    cv.addEventListener("pointerleave", esci);
    cv.addEventListener("pointerup", esci);
    const ro = new ResizeObserver(() => { costruisci(); if (!raf) disegna(); });
    ro.observe(cv);

    return () => {
      vivo = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      cv.removeEventListener("pointermove", suMouse); cv.removeEventListener("pointerdown", suMouse);
      cv.removeEventListener("pointerleave", esci); cv.removeEventListener("pointerup", esci);
    };
  }, [mappa]);

  return (
    <section
      ref={radice}
      aria-labelledby="titolo-volto"
      className="volto-scena relative flex h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#110F0B] px-5 text-[#F4EEE3] lg:flex-row lg:gap-16 lg:px-16"
    >
      <canvas
        ref={tela}
        role="img"
        aria-label={`Il volto di ${nome} fatto di punti, che si compone mentre scorri`}
        className="h-[52svh] w-[min(88vw,46svh)] touch-pan-y lg:h-[78svh] lg:w-[min(46vw,66svh)]"
      />
      <div className="mt-6 max-w-[30rem] text-center lg:mt-0 lg:text-left">
        <p className="volto-prima text-[1.05rem] text-white/60">Senza consenso, nessun volto.</p>
        <h2 id="titolo-volto" className="mt-2 text-[2.3rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[3rem] lg:text-[4rem]">
          Con il suo sì, {nome} prende forma.
        </h2>
        <p className="volto-dopo mt-4 text-[1.1rem] text-white/75 sm:text-[1.2rem]">
          Ogni punto è suo. Si compone solo quando lei dice sì, e ogni volta che viene usato, viene pagata.
        </p>
        <p className="mt-5 hidden text-[0.95rem] text-white/45 sm:block">Passaci sopra col mouse.</p>
      </div>
    </section>
  );
}
