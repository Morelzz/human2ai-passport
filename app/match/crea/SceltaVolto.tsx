"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface Volto {
  handle: string;
  alias: string;
  src: string;
}

interface Attributi { [k: string]: unknown }

// Chi sara' nella foto: griglia del registro, con la ricerca per descrizione
// (la stessa di prima, /api/match, ma dentro la scelta e non come passo a se').
// Mai ricerca da una foto: il volto di un altro non e' una chiave di ricerca.
export function SceltaVolto({
  volti,
  scelto,
  onScegli,
  onChiudi,
}: {
  volti: Volto[];
  scelto: string | null;
  onScegli: (handle: string) => void;
  onChiudi: () => void;
}) {
  const [testo, setTesto] = useState("");
  const [cerco, setCerco] = useState(false);
  const [trovati, setTrovati] = useState<string[] | null>(null);
  const [letto, setLetto] = useState<{ attrs: Attributi; category: string | null } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<"no" | "salvo" | "fatto">("no");
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onChiudi(); };
    window.addEventListener("keydown", esc);
    const prima = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prima; };
  }, [onChiudi]);

  async function cerca(e: React.FormEvent) {
    e.preventDefault();
    const t = testo.trim();
    if (t.length < 5) { setErrore("Scrivi qualcosa in più: per esempio donna 25-35, capelli scuri."); return; }
    setCerco(true);
    setErrore(null);
    setAvviso("no");
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: t, category: null }) });
      const j = await res.json();
      if (!res.ok) { setErrore(j.error ?? "Ricerca non riuscita"); setCerco(false); return; }
      const handles = (j.results ?? []).map((r: { handle: string }) => r.handle) as string[];
      setTrovati(handles);
      setLetto({ attrs: j.attrs ?? {}, category: j.category ?? null });
    } catch {
      setErrore("Ricerca non riuscita, riprova");
    }
    setCerco(false);
  }

  async function avvisami() {
    if (!letto) return;
    setAvviso("salvo");
    const res = await fetch("/api/match/alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attrs: letto.attrs, category: letto.category }) }).catch(() => null);
    if (res?.ok) setAvviso("fatto");
    else { setAvviso("no"); setErrore("Avviso non salvato, riprova"); }
  }

  const mostrati = trovati ? volti.filter((v) => trovati.includes(v.handle)) : volti;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="scelta-volto-titolo">
      <button type="button" aria-label="Chiudi" onClick={onChiudi} className="absolute inset-0 bg-[rgba(12,15,23,0.45)] backdrop-blur-[2px]" />
      <div className="relative flex max-h-[88vh] w-full max-w-[880px] flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg)] shadow-[0_40px_90px_-30px_rgba(12,15,23,0.6)] sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-7">
          <div>
            <h2 id="scelta-volto-titolo" className="text-[1.7rem] font-bold leading-tight tracking-[-0.035em] sm:text-[2.1rem]">Chi sarà nella foto?</h2>
            <p className="mt-1 text-[0.95rem] text-muted">Solo persone reali che hanno detto sì al proprio volto.</p>
          </div>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-amber/60">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <form onSubmit={cerca} className="px-5 sm:px-7">
          <div className="flex h-[52px] items-center gap-2 rounded-full border border-border bg-surface pl-4 pr-1.5 focus-within:border-amber/60">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="shrink-0 text-faint" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <label htmlFor="cerca-volto" className="sr-only">Descrivi chi cerchi</label>
            <input
              ref={campo}
              id="cerca-volto"
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="Descrivi chi cerchi: donna 25-35, capelli scuri"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint"
            />
            <button type="submit" disabled={cerco} className="h-10 shrink-0 rounded-full bg-foreground px-4 text-[0.88rem] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50">
              {cerco ? "Cerco…" : "Cerca"}
            </button>
          </div>
        </form>

        {errore && <p className="px-5 pt-2 text-[0.88rem] text-blocked sm:px-7">{errore}</p>}
        {trovati && (
          <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:px-7">
            <span className="text-[0.88rem] text-muted">
              {mostrati.length === 0 ? "Nessuna persona adatta ha ancora dato il consenso." : `${mostrati.length} ${mostrati.length === 1 ? "volto adatto" : "volti adatti"}`}
            </span>
            <button type="button" onClick={() => { setTrovati(null); setLetto(null); setTesto(""); }} className="text-[0.88rem] font-semibold text-amber-ink hover:underline">
              Mostra tutti
            </button>
          </div>
        )}

        <div className="mt-3 overflow-y-auto px-5 pb-6 pt-1.5 sm:px-7 sm:pb-7">
          {mostrati.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {mostrati.map((v) => {
                const attivo = v.handle === scelto;
                return (
                  <button
                    key={v.handle}
                    type="button"
                    onClick={() => onScegli(v.handle)}
                    aria-pressed={attivo}
                    className="group flex flex-col gap-2 text-left"
                  >
                    <span className={`relative block aspect-[3/4] overflow-hidden rounded-[16px] bg-[var(--hairline)] ${attivo ? "ring-[3px] ring-amber ring-offset-2 ring-offset-[var(--bg)]" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.src} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                      {attivo && (
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber text-on-amber">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                        </span>
                      )}
                    </span>
                    <span className="px-0.5 text-[0.92rem] font-semibold">{v.alias}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[0.95rem] leading-snug text-muted">
                Ti avvisiamo quando entra una persona adatta alla tua descrizione. Oppure sei tu quel volto?
              </span>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={avvisami} disabled={avviso !== "no"} className="h-11 rounded-full border border-foreground px-4 text-[0.9rem] font-semibold transition-opacity disabled:opacity-60">
                  {avviso === "fatto" ? "Avviso salvato" : avviso === "salvo" ? "Salvo…" : "Avvisami"}
                </button>
                <Link href="/signup" className="inline-flex h-11 items-center rounded-full bg-amber px-4 text-[0.9rem] font-semibold text-on-amber">Candidati</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
