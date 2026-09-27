"use client";

import { useEffect, useState, type ReactNode } from "react";

// ──────────────────────────────────────────────────────────────────────────
// I CAPITOLI DI UNA PAGINA LUNGA (27/9/2026, notte). Sul computer l'indice sta
// fermo a sinistra e si accende sul capitolo che stai leggendo, con il filo
// che si riempie; sul telefono l'indice e' una riga che scorre di lato in cima
// (niente colonne infinite). I capitoli sono <section id> dentro children.
// ──────────────────────────────────────────────────────────────────────────

export interface Capitolo { id: string; titolo: string }

export function Capitoli({ capitoli, children, etichetta = "In questa pagina" }: { capitoli: Capitolo[]; children: ReactNode; etichetta?: string }) {
  const [attivo, setAttivo] = useState(capitoli[0]?.id ?? "");
  const [letto, setLetto] = useState(0);

  useEffect(() => {
    const els = capitoli.map((c) => document.getElementById(c.id)).filter((e): e is HTMLElement => Boolean(e));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (voci) => {
        const vista = voci.filter((v) => v.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vista) setAttivo(vista.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    const scorri = () => {
      const primo = els[0].getBoundingClientRect().top + window.scrollY;
      const ultimo = els[els.length - 1];
      const fine = ultimo.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.6;
      setLetto(Math.max(0, Math.min(1, (window.scrollY - primo + window.innerHeight * 0.3) / Math.max(1, fine - primo))));
    };
    scorri();
    window.addEventListener("scroll", scorri, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", scorri); };
  }, [capitoli]);

  return (
    <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-16">
      <nav aria-label={etichetta} className="senza-barra -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 lg:hidden">
        {capitoli.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[0.88rem] transition-colors ${attivo === c.id ? "border-foreground bg-foreground text-[var(--bg)]" : "border-border text-muted"}`}>
            <span className="font-mono text-[0.7rem] opacity-60">{String(i + 1).padStart(2, "0")}</span>
            {c.titolo}
          </a>
        ))}
      </nav>
      <aside className="hidden lg:block">
        <nav aria-label={etichetta} className="sticky top-28">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-faint">{etichetta}</p>
          <div className="relative mt-4 pl-4">
            <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-edge" />
            <span aria-hidden className="absolute left-0 top-0 w-px bg-amber transition-[height] duration-200" style={{ height: `${letto * 100}%` }} />
            <ol className="flex flex-col gap-1">
              {capitoli.map((c, i) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} aria-current={attivo === c.id ? "true" : undefined} className={`flex gap-3 rounded-lg py-1.5 text-[0.92rem] leading-snug transition-colors ${attivo === c.id ? "font-semibold text-foreground" : "text-muted hover:text-foreground"}`}>
                    <span className={`font-mono text-[0.72rem] leading-[1.6] ${attivo === c.id ? "text-amber-ink" : "text-faint"}`}>{String(i + 1).padStart(2, "0")}</span>
                    {c.titolo}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
