"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// ──────────────────────────────────────────────────────────────────────────
// LA SERIE PER LE CAMPAGNE (27/9/2026, mockup C approvato da Morelz).
// Persona, vestiti, luce e look si fissano una volta; si scrivono fino a sei
// situazioni. Il primo scatto che tiene il volto diventa il riferimento degli
// altri (ruolo "serie" nel motore): stesso vestito, stessa luce, stesso colore.
// Ogni scatto passa dalla stessa /api/generate di sempre: stesso consenso,
// stesso controllo del volto, e quello che non tiene il volto non si paga.
// ──────────────────────────────────────────────────────────────────────────

export const MAX_SITUAZIONI = 6;
const facile = [0.2, 0.8, 0.2, 1] as const;
const due = (n: number) => String(n + 1).padStart(2, "0");

export function SituazioniSerie({ righe, onRighe }: { righe: string[]; onRighe: (r: string[]) => void }) {
  const ferma = useReducedMotion();
  const ultimo = useRef<HTMLInputElement>(null);
  const [nuova, setNuova] = useState(false);
  useEffect(() => { if (nuova) { ultimo.current?.focus(); setNuova(false); } }, [nuova, righe.length]);

  return (
    <div className="mt-1">
      <ul className="senza-barra -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        <AnimatePresence initial={false}>
          {righe.map((r, i) => (
            <motion.li
              key={i}
              layout={!ferma}
              initial={ferma ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: facile } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
              className="group flex w-[84%] shrink-0 snap-start items-center gap-2 rounded-[14px] sm:w-auto border border-border bg-[var(--bg)] pl-3 pr-1 transition-colors focus-within:border-amber"
            >
              <span className="font-mono text-[0.75rem] tabular-nums text-faint">{due(i)}</span>
              <input
                ref={i === righe.length - 1 ? ultimo : undefined}
                value={r}
                maxLength={300}
                onChange={(e) => onRighe(righe.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && r.trim() && righe.length < MAX_SITUAZIONI) { e.preventDefault(); onRighe([...righe, ""]); setNuova(true); }
                }}
                placeholder={["al tavolino di un bar, ride", "cammina in centro con una borsa", "sul terrazzo al tramonto"][i] ?? "un'altra situazione"}
                aria-label={`Situazione ${i + 1}`}
                className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint sm:text-[0.92rem]"
              />
              {righe.length > 1 && (
                <button type="button" onClick={() => onRighe(righe.filter((_, j) => j !== i))} aria-label={`Togli la situazione ${i + 1}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-faint hover:bg-[var(--hairline)] hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              )}
            </motion.li>
          ))}
          {righe.length < MAX_SITUAZIONI && (
            <motion.li key="aggiungi" layout={!ferma} className="w-[60%] shrink-0 snap-start sm:w-auto">
              <button
                type="button"
                onClick={() => { onRighe([...righe, ""]); setNuova(true); }}
                className="flex h-11 w-full items-center gap-2 rounded-[14px] border border-dashed border-amber/60 px-3 text-[0.9rem] font-semibold text-amber-ink transition-colors hover:bg-amber-soft"
              >
                <span className="font-mono text-[0.75rem] font-normal tabular-nums">{due(righe.length)}</span>
                aggiungi una situazione
              </button>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}

type StatoScatto =
  | { s: "coda" }
  | { s: "invio" | "lavoro" }
  | { s: "fatto"; certificate: string; somiglianza: number | null; guida: boolean }
  | { s: "errore"; msg: string; rimborsato: boolean };

export interface SerieDaFare {
  situazioni: string[];
  corpo: Record<string, unknown>; // il corpo di /api/generate senza la scena
  alias: string;
  voltPerScatto: number | null;
}

// Una foto finita diventa il riferimento degli altri: ridotta a 1024 px.
async function comeRiferimento(certificate: string): Promise<string | null> {
  try {
    const blob = await (await fetch(`/api/content/${certificate}`)).blob();
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  }
}

export function SerieAlLavoro({ serie, onNuova, onRicarica }: { serie: SerieDaFare; onNuova: () => void; onRicarica: () => void }) {
  const ferma = useReducedMotion();
  const [stati, setStati] = useState<StatoScatto[]>(() => serie.situazioni.map(() => ({ s: "coda" })));
  const [fermata, setFermata] = useState<string | null>(null);
  const vivo = useRef(true);
  const partita = useRef(false);

  const metti = (i: number, st: StatoScatto) => { if (vivo.current) setStati((l) => l.map((x, j) => (j === i ? st : x))); };

  useEffect(() => {
    vivo.current = true;
    if (partita.current) return () => { vivo.current = false; };
    partita.current = true;
    let stop: string | null = null;

    async function uno(i: number, guida: string | null): Promise<string | null> {
      if (stop) return null;
      metti(i, { s: "invio" });
      const propri = Array.isArray(serie.corpo.extraRefs) ? (serie.corpo.extraRefs as unknown[]) : [];
      const extraRefs = guida ? [{ data: guida, desc: "", role: "serie" }, ...propri].slice(0, 2) : propri;
      let res: Response;
      let j: Record<string, unknown>;
      try {
        res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...serie.corpo, scene: serie.situazioni[i], extraRefs }) });
        j = await res.json();
      } catch {
        metti(i, { s: "errore", msg: "Connessione persa", rimborsato: false });
        return null;
      }
      if (res.status === 402) { stop = "VOLT finiti: gli scatti che mancano non sono partiti e non si pagano."; setFermata(stop); metti(i, { s: "coda" }); return null; }
      if (!res.ok) {
        if (res.status === 403) { stop = String(j.error ?? "Serie fermata"); setFermata(stop); }
        if (j.volt_refunded) window.dispatchEvent(new Event("volt:refetch"));
        metti(i, { s: "errore", msg: String(j.error ?? "Non è partito"), rimborsato: Boolean(j.volt_refunded) });
        return null;
      }
      const volt = j.volt as { balance: number | null } | undefined;
      if (volt && volt.balance !== null) window.dispatchEvent(new CustomEvent("volt:update", { detail: { balance: volt.balance } }));
      const limite = Date.now() + 20 * 60 * 1000;
      while (vivo.current && Date.now() < limite) {
        await new Promise((r) => setTimeout(r, 3000));
        let pj: Record<string, unknown>;
        try {
          const r = await fetch(`/api/generate/job/${String(j.jobId)}`);
          pj = await r.json();
          if (!r.ok) { metti(i, { s: "errore", msg: String(pj.error ?? "Non riesco a seguirlo"), rimborsato: false }); return null; }
        } catch { continue; }
        if (pj.status === "running") metti(i, { s: "lavoro" });
        if (pj.status === "done" && pj.certificate) {
          metti(i, { s: "fatto", certificate: String(pj.certificate), somiglianza: typeof pj.identity_score === "number" ? pj.identity_score : null, guida: !guida });
          return String(pj.certificate);
        }
        if (pj.status === "error") {
          window.dispatchEvent(new Event("volt:refetch"));
          metti(i, { s: "errore", msg: String(pj.error ?? "Non è riuscito"), rimborsato: true });
          return null;
        }
      }
      if (vivo.current) metti(i, { s: "errore", msg: "Ancora in lavorazione: lo trovi in I miei contenuti", rimborsato: false });
      return null;
    }

    (async () => {
      // Uno alla volta finche' uno non tiene il volto: quello fa da guida.
      let guida: string | null = null;
      let i = 0;
      for (; i < serie.situazioni.length && !stop; i++) {
        const cert = await uno(i, null);
        if (cert) {
          guida = await comeRiferimento(cert);
          i++;
          break;
        }
      }
      // Gli altri due alla volta, tutti con la stessa guida.
      const resto = Array.from({ length: serie.situazioni.length - i }, (_, k) => i + k);
      const lavora = async () => { while (resto.length && !stop && vivo.current) await uno(resto.shift()!, guida); };
      await Promise.all([lavora(), lavora()]);
    })();
    return () => { vivo.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fatti = stati.filter((s) => s.s === "fatto").length;
  const persi = stati.filter((s) => s.s === "errore").length;
  const finita = stati.every((s) => s.s === "fatto" || s.s === "errore" || (fermata && s.s === "coda"));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-verified">
            {finita ? "Serie pronta" : "Serie al lavoro"}
          </span>
          <h1 className="mt-2 text-[2.4rem] font-bold leading-none tracking-[-0.045em] sm:text-[3rem]">
            {serie.alias}, {fatti} di {serie.situazioni.length}
          </h1>
          <p className="mt-2 max-w-[60ch] text-[0.95rem] leading-relaxed text-muted">
            Stessa persona, stessi vestiti, stessa luce. Il primo scatto riuscito fa da guida agli altri.
            {persi > 0 ? ` ${persi === 1 ? "Uno scatto non ha" : `${persi} scatti non hanno`} tenuto il volto o non ${persi === 1 ? "è partito" : "sono partiti"}: non si paga${persi === 1 ? "" : "no"}.` : ""}
          </p>
        </div>
        {finita && (
          <motion.div initial={ferma ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
            <button type="button" onClick={onNuova} className="inline-flex h-12 items-center rounded-full bg-amber px-5 text-[0.95rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">Nuova serie</button>
            <a href="/account" className="inline-flex h-12 items-center rounded-full border border-edge bg-surface px-5 text-[0.95rem] font-semibold transition-colors hover:border-amber/70">I miei contenuti</a>
          </motion.div>
        )}
      </div>
      {fermata && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blocked/40 bg-blocked-soft px-4 py-3 text-[0.92rem] text-on-blocked">
          {fermata}
          {fermata.startsWith("VOLT") && <button type="button" onClick={onRicarica} className="font-semibold underline underline-offset-4">Ricarica</button>}
        </div>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stati.map((st, i) => (
          <li key={i} className="relative aspect-[2/3] overflow-hidden rounded-[20px] bg-[var(--hairline)]">
            <AnimatePresence mode="wait">
              {st.s === "fatto" ? (
                <motion.a
                  key="fatto"
                  href={`/api/content/${st.certificate}`}
                  target="_blank"
                  rel="noopener"
                  initial={ferma ? false : { opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: facile } }}
                  className="group block h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/content/${st.certificate}`} alt={serie.situazioni[i]} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span className="absolute bottom-2.5 left-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-[rgba(12,15,23,0.68)] px-2.5 font-mono text-[0.72rem] text-[#F2E9D8]">
                    {due(i)}{st.somiglianza !== null ? ` · ${st.somiglianza}%` : ""}{st.guida ? " · guida" : ""}
                  </span>
                </motion.a>
              ) : (
                <motion.div key={st.s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full flex-col justify-between p-3.5">
                  <span className="font-mono text-[0.75rem] tabular-nums text-faint">{due(i)}</span>
                  <p className={`text-[0.92rem] leading-snug ${st.s === "errore" ? "text-muted line-through decoration-faint" : "text-foreground"}`}>{serie.situazioni[i]}</p>
                  <div>
                    {st.s === "errore" ? (
                      <span className="text-[0.8rem] leading-snug text-on-blocked">{st.msg}{st.rimborsato ? ". VOLT restituiti" : ""}</span>
                    ) : (
                      <>
                        <span className="text-[0.8rem] text-muted">{st.s === "coda" ? (fermata ? "non partito" : "in coda") : st.s === "invio" ? "parte…" : "sta girando…"}</span>
                        {st.s !== "coda" && <span className="serie-barra mt-2 block h-[3px] overflow-hidden rounded-full bg-[var(--hairline-strong,rgba(0,0,0,0.08))]" />}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {(st.s === "invio" || st.s === "lavoro") && <span aria-hidden className="serie-luce pointer-events-none absolute inset-0" />}
          </li>
        ))}
      </ul>
    </section>
  );
}
