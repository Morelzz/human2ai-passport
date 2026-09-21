"use client";

import { useEffect, useState } from "react";

// LE LINGUETTE DELL'ACCOUNT (22/9/2026). Prima l'account era una colonna da
// 560 pixel con dieci riquadri impilati: per arrivare ai propri contenuti si
// scorreva oltre tipo di account, KYC, VOLT, lavori in corso, protezione e i
// link da operatore. Adesso ogni cosa sta a casa sua.
//
// Il contenuto delle schede lo prepara il SERVER e arriva qui gia' fatto:
// questo componente decide solo quale si vede. Sul telefono le linguette
// scorrono di lato, mai in colonna.

export interface Scheda {
  id: string;
  l: string;
  badge?: number | null; // il numero nella pillola (contenuti, cose da fare)
  nodo: React.ReactNode;
}

const CHIAVE = "semblic:account-scheda";
export const EVENTO = "semblic:vai-alla-scheda";

/** Un bottone che porta a un'altra scheda senza ricaricare la pagina. */
export function VaiAllaScheda({ a, children, className = "" }: { a: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent(EVENTO, { detail: a }))}>
      {children}
    </button>
  );
}

export function Linguette({ schede }: { schede: Scheda[] }) {
  const [attiva, setAttiva] = useState(schede[0]?.id ?? "");

  // Dopo un giro sul sito si torna dove si era rimasti. Comodita', niente di
  // piu': se il browser non ha la memoria (finestra anonima) non cambia nulla.
  useEffect(() => {
    try {
      const salvata = sessionStorage.getItem(CHIAVE);
      if (salvata && schede.some((s) => s.id === salvata)) setAttiva(salvata);
    } catch {}
    // solo al primo montaggio: dopo comanda il clic
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un bottone dentro una scheda puo' chiamarne un'altra (es. "vedi tutti").
  useEffect(() => {
    const vai = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (schede.some((s) => s.id === id)) scegli(id);
    };
    window.addEventListener(EVENTO, vai);
    return () => window.removeEventListener(EVENTO, vai);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schede.length]);

  function scegli(id: string) {
    setAttiva(id);
    try {
      sessionStorage.setItem(CHIAVE, id);
    } catch {}
  }

  const corrente = schede.find((s) => s.id === attiva) ?? schede[0];

  return (
    <>
      <div role="tablist" aria-label="Sezioni dell'account" className="senza-barra -mx-5 mt-6 flex gap-1 overflow-x-auto border-b border-border px-5 sm:mx-0 sm:px-0">
        {schede.map((s) => {
          const on = s.id === corrente?.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`scheda-${s.id}`}
              onClick={() => scegli(s.id)}
              className={`focus-ring -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 pb-3 pt-2 text-[0.92rem] font-semibold transition-colors ${
                on ? "border-amber text-foreground" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {s.l}
              {s.badge ? (
                <span className="rounded-full bg-amber-soft px-1.5 py-px font-mono text-[0.62rem] font-bold text-amber-ink">{s.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div id={`scheda-${corrente?.id}`} role="tabpanel" className="pt-6">
        {corrente?.nodo}
      </div>
    </>
  );
}
