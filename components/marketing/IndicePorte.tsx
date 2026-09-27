"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ──────────────────────────────────────────────────────────────────────────
// L'INDICE DELLE PORTE (27/9/2026, notte). Al posto delle tre schede con
// l'icona e della striscia AI Act: un indice grande, una riga per porta, come
// il sommario di una rivista. Passandoci sopra col mouse, lo scatto vero di
// quella pagina segue il puntatore dentro la lente; sul telefono ogni riga ha
// la sua miniatura. Le foto arrivano gia' filtrate dal server (consenso vivo):
// una porta senza foto resta una riga di testo.
// ──────────────────────────────────────────────────────────────────────────

export interface Porta {
  href: string;
  nome: string;
  frase: string;
  foto: { src: string; fuoco: string; persone: string } | null;
}

export function IndicePorte({ porte }: { porte: Porta[] }) {
  const radice = useRef<HTMLElement>(null);
  const lente = useRef<HTMLDivElement>(null);
  const [sopra, setSopra] = useState<number | null>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });

  useEffect(() => {
    const el = radice.current, l = lente.current;
    if (!el || !l) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const p = pos.current;
    const giro = () => {
      p.x += (p.tx - p.x) * 0.16; p.y += (p.ty - p.y) * 0.16;
      l.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      p.raf = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.3 ? requestAnimationFrame(giro) : 0;
    };
    const muovi = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      p.tx = e.clientX - r.left; p.ty = e.clientY - r.top;
      if (!p.raf) p.raf = requestAnimationFrame(giro);
    };
    el.addEventListener("pointermove", muovi);
    return () => { el.removeEventListener("pointermove", muovi); cancelAnimationFrame(p.raf); };
  }, []);

  const attiva = sopra !== null ? porte[sopra] : null;

  return (
    <section ref={radice} aria-labelledby="titolo-indice-porte" className="relative mx-auto max-w-[1380px] px-5 pt-20 sm:px-8 sm:pt-28">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-amber-ink">Per chi crea sul serio</p>
          <h2 id="titolo-indice-porte" className="mt-3 max-w-[18ch] text-balance text-[2.3rem] font-bold leading-[0.96] tracking-[-0.045em] sm:text-[3.6rem]">
            Crea con volti veri, senza rischi legali.
          </h2>
        </div>
        <p className="hidden max-w-[34ch] pb-2 text-[1rem] leading-relaxed text-muted lg:block">
          Ogni porta porta la stessa prova: consenso letto prima, certificato dentro il file, la persona pagata.
        </p>
      </div>

      <ol className="mt-10 border-t border-edge" onPointerLeave={() => setSopra(null)}>
        {porte.map((p, i) => (
          <li key={p.href} className="border-b border-edge">
            <Link
              href={p.href}
              onPointerEnter={() => setSopra(i)}
              onFocus={() => setSopra(i)}
              onBlur={() => setSopra(null)}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:gap-8 sm:py-7"
            >
              <span className="font-mono text-[0.78rem] text-faint transition-colors group-hover:text-amber-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 items-center gap-4">
                {p.foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.foto.src} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded-xl object-cover sm:hidden" style={{ objectPosition: p.foto.fuoco }} />
                )}
                <span className="min-w-0">
                  <span className="block text-[1.7rem] font-bold leading-none tracking-[-0.04em] transition-transform duration-300 group-hover:translate-x-2 sm:text-[3rem] lg:text-[3.6rem]">{p.nome}</span>
                  <span className="mt-2 block text-[0.95rem] leading-snug text-muted sm:text-[1.05rem]">{p.frase}</span>
                </span>
              </span>
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full border border-edge transition-all duration-300 group-hover:border-amber group-hover:bg-amber group-hover:text-on-amber sm:h-14 sm:w-14">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* La lente che segue il puntatore, con lo scatto della porta sotto il mouse. */}
      <div ref={lente} aria-hidden className="pointer-events-none absolute left-0 top-0 z-10 hidden [@media(pointer:fine)]:block">
        {porte.map((p, i) =>
          p.foto ? (
            <div
              key={p.href}
              className="absolute left-0 top-0 h-[300px] w-[240px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] shadow-[0_40px_80px_-30px_rgba(12,10,6,0.6)] transition-[opacity,transform] duration-300"
              style={{ opacity: sopra === i ? 1 : 0, transform: `translate(28px, -58%) scale(${sopra === i ? 1 : 0.9}) rotate(${sopra === i ? -3 : 0}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.foto.src} alt="" className="h-full w-full object-cover" style={{ objectPosition: p.foto.fuoco }} />
              <span className="absolute inset-x-3 top-3 h-[42%]">
                <i className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[#3DDC97]" />
                <i className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[#3DDC97]" />
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8 font-mono text-[10.5px] text-white/85">
                <i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#3DDC97]" />consenso attivo, {p.foto.persone}
              </span>
            </div>
          ) : null,
        )}
      </div>
      <span className="sr-only" aria-live="polite">{attiva ? attiva.nome : ""}</span>
    </section>
  );
}
