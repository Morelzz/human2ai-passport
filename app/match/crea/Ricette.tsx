"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LOOKS, LUCI, FORMATI } from "./opzioni";
import { nomeProposto, type Ricetta, type RicettaNuova } from "@/lib/ricette";
import { vistaContenuto } from "@/lib/sample-size";

// ──────────────────────────────────────────────────────────────────────────
// Le ricette in Crea (mockup B, 27/9/2026): la riga "Le tue ricette" sopra le
// idee, e il "Salva come ricetta" nella schermata dello scatto pronto.
// Una ricetta non porta la persona: si usa con chi e' in scena.
// ──────────────────────────────────────────────────────────────────────────

export type Impostazioni = Omit<RicettaNuova, "nome" | "certificate">;

export function riassunto(r: Pick<Ricetta, "luce" | "vestiti" | "formato" | "look">): string {
  return [
    r.luce ? LUCI.find((l) => l.v === r.luce)?.l : null,
    r.vestiti.find(Boolean) ?? null,
    FORMATI.find((f) => f.v === r.formato)?.l,
    r.look !== "naturale" ? LOOKS.find((l) => l.v === r.look)?.l : null,
  ].filter(Boolean).join(" · ");
}

const facile = [0.2, 0.8, 0.2, 1] as const;

export function RigaRicette({
  ricette,
  conChi,
  attiva,
  onUsa,
  onTolta,
}: {
  ricette: Ricetta[];
  conChi: string | null; // alias di chi e' in scena, per il bottone
  attiva: string | null;
  onUsa: (r: Ricetta) => void;
  onTolta: (id: string) => void;
}) {
  const ferma = useReducedMotion();
  const [chiedo, setChiedo] = useState<string | null>(null);

  async function togli(id: string) {
    setChiedo(null);
    onTolta(id);
    await fetch(`/api/ricette/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <section aria-labelledby="titolo-ricette" className="mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titolo-ricette" className="text-[1.05rem] font-semibold">Le tue ricette</h2>
        <span className="hidden text-[0.85rem] text-faint sm:inline">scena, luce e vestiti pronti: cambia solo chi c&apos;è</span>
      </div>
      <ul className="senza-barra -mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        <AnimatePresence initial={true} mode="popLayout">
          {ricette.map((r, i) => (
            <motion.li
              key={r.id}
              layout={!ferma}
              initial={ferma ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: facile, delay: Math.min(i, 6) * 0.05 } }}
              exit={ferma ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
              className={`group relative w-[232px] shrink-0 snap-start overflow-hidden rounded-[20px] border bg-surface transition-[border-color,box-shadow] duration-300 ${
                attiva === r.id ? "border-amber shadow-[0_18px_40px_-28px_rgba(226,154,46,0.8)]" : "border-border hover:border-amber/50"
              }`}
            >
              <div className="relative h-[124px] overflow-hidden bg-[var(--hairline)]">
                {r.certificate && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vistaContenuto(r.certificate, 480)} alt="" loading="lazy" className="h-full w-full object-cover object-[50%_30%] transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(14,12,9,0.66)] px-2.5 py-1 text-[0.72rem] text-[#F2E9D8]">
                  {attiva === r.id ? "in uso" : "ricetta"}
                </span>
                <button
                  type="button"
                  onClick={() => setChiedo(r.id)}
                  aria-label={`Togli la ricetta ${r.nome}`}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(14,12,9,0.6)] text-[#F2E9D8] transition-opacity hover:bg-[rgba(14,12,9,0.8)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
                <AnimatePresence>
                  {chiedo === r.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(14,12,9,0.82)] text-[#F2E9D8] backdrop-blur-[2px]"
                    >
                      <span className="text-[0.88rem] font-semibold">Togliere la ricetta?</span>
                      <span className="flex gap-2">
                        <button type="button" onClick={() => togli(r.id)} className="h-8 rounded-full bg-[#F2E9D8] px-3.5 text-[0.82rem] font-bold text-[#17150F]">Togli</button>
                        <button type="button" onClick={() => setChiedo(null)} className="h-8 rounded-full border border-[rgba(242,233,216,0.4)] px-3.5 text-[0.82rem] font-semibold">Tienila</button>
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="px-3.5 pb-3.5 pt-3">
                <b className="block truncate text-[0.98rem] tracking-[-0.01em]">{r.nome}</b>
                <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[0.8rem] leading-[1.2rem] text-muted">{riassunto(r) || r.scena}</p>
                <button
                  type="button"
                  onClick={() => onUsa(r)}
                  className="mt-2.5 h-[38px] w-full rounded-full border border-border bg-[var(--bg)] text-[0.85rem] font-semibold text-foreground transition-[background-color,border-color,transform] duration-200 hover:border-amber/70 active:scale-[0.98]"
                >
                  {conChi ? `Usa con ${conChi}` : "Usa con…"}
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

// "Salva come ricetta" sullo scatto pronto: si apre sul posto con un nome gia'
// proposto, e quando e' salvata il bottone diventa la conferma.
export function SalvaRicetta({
  certificate,
  impostazioni,
  onSalvata,
}: {
  certificate: string;
  impostazioni: Impostazioni;
  onSalvata?: (r: Ricetta) => void;
}) {
  const ferma = useReducedMotion();
  const [aperta, setAperta] = useState(false);
  const [nome, setNome] = useState(() => nomeProposto(impostazioni.scena));
  const [stato, setStato] = useState<"libera" | "salvo" | "salvata">("libera");
  const [errore, setErrore] = useState<string | null>(null);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || stato !== "libera") return;
    setStato("salvo");
    setErrore(null);
    try {
      const res = await fetch("/api/ricette", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...impostazioni, nome, certificate }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setStato("libera"); setErrore(String(j.error ?? "Non sono riuscito a salvarla")); return; }
      setStato("salvata");
      setAperta(false);
      onSalvata?.(j.ricetta as Ricetta);
    } catch {
      setStato("libera");
      setErrore("Connessione persa, riprova.");
    }
  }

  if (stato === "salvata") {
    return (
      <motion.p
        initial={ferma ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 inline-flex items-center gap-2 text-[0.92rem] font-semibold text-verified"
        role="status"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path d="M20 6 9 17l-5-5" initial={ferma ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: facile }} />
        </svg>
        Ricetta salvata: la trovi in cima a Crea, pronta per chiunque
      </motion.p>
    );
  }

  return (
    <div className="mt-3">
      <AnimatePresence initial={false} mode="wait">
        {!aperta ? (
          <motion.button
            key="apri"
            type="button"
            onClick={() => setAperta(true)}
            initial={ferma ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="inline-flex items-center gap-2 text-[0.95rem] font-semibold text-amber-ink hover:underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            Salva come ricetta: stessa scena, luce e vestiti con chi vuoi
          </motion.button>
        ) : (
          <motion.form
            key="nome"
            onSubmit={salva}
            initial={ferma ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: facile } }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-2"
          >
            <label htmlFor="nome-ricetta" className="sr-only">Nome della ricetta</label>
            <input
              id="nome-ricetta"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={60}
              autoFocus
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-[16px] outline-none transition-colors focus:border-amber sm:text-[0.95rem]"
            />
            <button type="submit" disabled={!nome.trim() || stato === "salvo"} className="h-11 rounded-full bg-foreground px-5 text-[0.92rem] font-semibold text-[var(--bg)] transition-opacity disabled:opacity-50">
              {stato === "salvo" ? "Salvo…" : "Salva"}
            </button>
            <button type="button" onClick={() => setAperta(false)} className="h-11 px-2 text-[0.88rem] text-muted hover:text-foreground">Annulla</button>
          </motion.form>
        )}
      </AnimatePresence>
      {errore && <p className="mt-2 text-[0.88rem] text-on-blocked">{errore}</p>}
    </div>
  );
}
