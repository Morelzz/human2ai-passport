"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nomi } from "./opzioni";

export type StatoSet = "invio" | "coda" | "lavoro";

// Il set al lavoro: cosa sta succedendo allo scatto, passo per passo. Onesto:
// consenso e identita' li ha gia' controllati il server prima di accettare il
// lavoro; controllo volti protetti, filigrana e certificato arrivano insieme
// all'immagine. Niente percentuali inventate: un cronometro e lo stato vero.
export function SulSet({
  alias,
  ritratto,
  stato,
  inizio,
  riepilogo,
  volt,
  inScena = null,
  gruppo = null,
}: {
  alias: string;
  ritratto: string;
  stato: StatoSet;
  inizio: number;
  riepilogo: string;
  volt: number | null;
  inScena?: string | null; // casting automatico: il ruolo nella scena per cui Semblic ha scelto il volto
  gruppo?: string[] | null; // scena di gruppo: i nomi, da sinistra
}) {
  const [adesso, setAdesso] = useState(inizio);
  useEffect(() => {
    const t = setInterval(() => setAdesso(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondi = Math.max(0, Math.floor((adesso - inizio) / 1000));
  const orologio = `${String(Math.floor(secondi / 60)).padStart(2, "0")}:${String(secondi % 60).padStart(2, "0")}`;
  const accettato = stato !== "invio";

  const chi = gruppo && gruppo.length > 1 ? nomi(gruppo) : null;
  const passi: { t: string; d: string; fatto: boolean; attivo: boolean; nota?: string }[] = [
    ...(inScena && !chi ? [{ t: "Volto scelto per la scena", d: `${alias} dal registro, per \"${inScena}\"`, fatto: true, attivo: false }] : []),
    ...(inScena && chi ? [{ t: "Volti scelti per la scena", d: `${chi} dal registro`, fatto: true, attivo: false }] : []),
    chi
      ? { t: "Consenso verificato", d: `${chi} hanno detto sì all'uso commerciale, ed è ancora così`, fatto: accettato, attivo: !accettato }
      : { t: "Consenso verificato", d: `${alias} ha detto sì all'uso commerciale, ed è ancora così`, fatto: accettato, attivo: !accettato },
    { t: chi ? "Identità agganciate" : "Identità agganciata", d: chi ? "Le foto verificate di ogni persona guidano il suo volto" : "Le sue foto verificate guidano il volto", fatto: accettato, attivo: false },
    { t: "Scena composta", d: riepilogo, fatto: accettato, attivo: false },
    {
      t: "Sviluppo dell'immagine",
      d: stato === "coda" ? "In fila per il motore, tocca a te a momenti" : chi ? "Prima la scena, poi un volto alla volta" : "Il motore sta disegnando lo scatto",
      fatto: false,
      attivo: accettato,
      nota: stato === "coda" ? "in coda" : stato === "lavoro" ? "in corso" : undefined,
    },
    { t: "Controllo volti protetti", d: "Nessun volto di chi ha chiesto tutela deve comparire", fatto: false, attivo: false },
    { t: "Filigrana e certificato", d: "Invisibile nell'immagine, verificabile con Sigil", fatto: false, attivo: false },
  ];

  return (
    <section aria-live="polite" className="grid gap-8 lg:grid-cols-[minmax(0,500px)_1fr] lg:gap-14">
      <div data-theme="dark" className="isola flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[0.68rem] tracking-[0.22em] text-faint">SUL SET</span>
          <span className="font-mono text-[0.8rem] tabular-nums text-amber">{orologio}</span>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ritratto} alt="" aria-hidden className="h-full w-full scale-110 object-cover blur-[22px] brightness-[0.6] saturate-[1.2]" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundImage: "linear-gradient(rgba(242,233,216,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(242,233,216,0.06) 1px, transparent 1px)", backgroundSize: "44px 44px" }}
          />
          <span aria-hidden className="set-scan" />
          <div className="absolute inset-x-0 top-[42%] flex flex-col items-center gap-1.5 text-center">
            <span className="text-[1.05rem] font-semibold text-foreground">{accettato ? "Sviluppo in corso" : "Preparo il set"}</span>
            <span className="text-[0.85rem] text-muted">{chi ? "qualche minuto: un passaggio per ogni volto" : "di solito meno di un minuto"}</span>
          </div>
        </div>
        <p className="px-1 text-[0.85rem] leading-relaxed text-muted">
          Puoi anche chiudere la pagina: lo scatto ti aspetta in <Link href="/account" className="text-foreground underline underline-offset-4">I miei contenuti</Link>.
        </p>
      </div>

      <div className="flex flex-col lg:pt-2">
        <span className="kicker">Scatto in lavorazione</span>
        <h1 className="mt-3 text-balance text-[2.3rem] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[3.1rem]">Stiamo girando la tua scena.</h1>
        <p className="mt-3 max-w-[52ch] text-pretty text-[1rem] leading-relaxed text-muted">
          Ogni passaggio viene registrato. Alla fine lo scatto esce con il suo certificato, e {chi ? "ogni persona riceve" : `${alias} riceve`} la sua parte.
        </p>

        <ol className="mt-7 flex flex-col">
          {passi.map((p, i) => (
            <li key={p.t} className={`flex items-center gap-3.5 py-3.5 ${i < passi.length - 1 ? "border-b border-border" : ""}`}>
              {p.fatto ? (
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-verified-soft text-verified">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                </span>
              ) : p.attivo ? (
                <span aria-hidden className="set-giro h-[30px] w-[30px] shrink-0 rounded-full border-[2.5px] border-amber border-r-transparent" />
              ) : (
                <span aria-hidden className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-edge" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-[1rem] font-semibold ${p.fatto || p.attivo ? "text-foreground" : "text-faint"}`}>{p.t}</span>
                <span className={`text-[0.86rem] leading-snug ${p.fatto || p.attivo ? "text-muted" : "text-faint"}`}>{p.d}</span>
              </div>
              {p.nota && <span className="shrink-0 font-mono text-[0.78rem] text-amber-ink">{p.nota}</span>}
              <span className="sr-only">{p.fatto ? "fatto" : p.attivo ? "in corso" : "in attesa"}</span>
            </li>
          ))}
        </ol>

        <div className="card mt-6 flex items-center gap-3 p-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-verified" aria-hidden>
            <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
          <span className="text-[0.95rem] leading-snug">
            {volt ? `Se qualcosa va storto, i ${volt} VOLT tornano sul tuo saldo da soli.` : "Se qualcosa va storto, non paghi nulla."}
          </span>
        </div>
      </div>
    </section>
  );
}
