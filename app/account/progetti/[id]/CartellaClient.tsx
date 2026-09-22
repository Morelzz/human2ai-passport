"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_CONTENUTI, postiLiberi } from "@/lib/progetti";

export interface ScattoScegliibile {
  id: string;
  certificate: string | null;
  alias: string;
  prompt: string;
  dentro: boolean;
}

// DENTRO UNA CARTELLA: metti e togli scatti, accendi il link, dallo al cliente.
// Il link si accende con un interruttore solo, e si spegne allo stesso modo:
// niente menu, niente conferme, e il testo dice sempre cosa vede chi lo apre.

export function CartellaClient({
  id, slug, linkAttivo, scatti, origin,
}: {
  id: string;
  slug: string;
  linkAttivo: boolean;
  scatti: ScattoScegliibile[];
  origin: string;
}) {
  const router = useRouter();
  const [acceso, setAcceso] = useState(linkAttivo);
  const [dentro, setDentro] = useState(() => new Set(scatti.filter((s) => s.dentro).map((s) => s.id)));
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const url = `${origin}/p/${slug}`;

  async function chiama(body: Record<string, unknown>) {
    setBusy(true);
    setErrore(null);
    try {
      const r = await fetch(`/api/progetti/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Non è stato salvato.");
      router.refresh();
      return true;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Non è stato salvato.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function cambia(s: ScattoScegliibile) {
    const gia = dentro.has(s.id);
    const nuovo = new Set(dentro);
    if (gia) nuovo.delete(s.id);
    else nuovo.add(s.id);
    setDentro(nuovo);
    const ok = await chiama(gia ? { togli: [s.id] } : { aggiungi: [s.id] });
    if (!ok) setDentro(dentro); // torna com'era
  }

  async function interruttore() {
    const nuovo = !acceso;
    setAcceso(nuovo);
    const ok = await chiama({ link_attivo: nuovo });
    if (!ok) setAcceso(!nuovo);
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      window.prompt("Copia il link:", url);
    }
  }

  const quanti = dentro.size;

  return (
    <>
      <div className={`mt-6 rounded-[20px] border p-5 ${acceso ? "border-verified/30 bg-verified-soft" : "border-border bg-surface"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="kicker">IL LINK PER IL CLIENTE</p>
            <p className="mt-2 max-w-[60ch] text-[0.9rem] leading-relaxed text-muted">
              {acceso
                ? "Chiunque abbia questo indirizzo vede gli scatti di questa cartella, chi c'è dentro e cosa ha autorizzato. Non serve un account."
                : "Acceso, crea un indirizzo pubblico da mandare al tuo cliente. Spento, la pagina non esiste per nessuno."}
            </p>
          </div>
          <button
            type="button"
            onClick={interruttore}
            disabled={busy}
            aria-pressed={acceso}
            className={`focus-ring h-[44px] shrink-0 rounded-full px-5 text-[0.9rem] font-bold transition-colors disabled:opacity-60 ${
              acceso ? "border border-border bg-surface text-foreground hover:border-blocked/50" : "bg-amber text-on-amber hover:bg-amber-hover"
            }`}
          >
            {acceso ? "Spegni il link" : "Accendi il link"}
          </button>
        </div>

        {acceso && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-surface px-3.5 py-2.5 font-mono text-[0.82rem]">{url}</code>
            <button type="button" onClick={copia} className="focus-ring rounded-full bg-foreground px-4 py-2.5 text-[0.85rem] font-bold text-[var(--bg)]">
              {copiato ? "Copiato" : "Copia"}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="focus-ring rounded-full border border-border px-4 py-2.5 text-[0.85rem] font-semibold text-muted transition-colors hover:border-amber/60 hover:text-foreground">
              Guarda com&apos;è
            </a>
          </div>
        )}
      </div>

      {errore && <p className="mt-3 rounded-xl border border-blocked/30 bg-blocked-soft px-4 py-3 text-[0.88rem] text-on-blocked">{errore}</p>}

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.3rem] font-bold tracking-[-0.025em]">Cosa c&apos;è dentro</h2>
        <span className="text-[0.82rem] text-faint">
          {quanti} di {MAX_CONTENUTI} · {postiLiberi(quanti)} posti liberi
        </span>
      </div>

      {scatti.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="text-[0.95rem] text-muted">Non hai ancora scatti da mettere in una cartella.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {scatti.map((s) => {
            const on = dentro.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => cambia(s)}
                disabled={busy}
                aria-pressed={on}
                className={`focus-ring group relative overflow-hidden rounded-[18px] border-2 text-left transition-colors disabled:opacity-70 ${
                  on ? "border-amber" : "border-transparent hover:border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.certificate ? `/api/content/${s.certificate}` : ""}
                  alt={s.prompt || s.alias}
                  loading="lazy"
                  className={`block aspect-[3/4] w-full object-cover transition-opacity ${on ? "" : "opacity-80 group-hover:opacity-100"}`}
                />
                <span aria-hidden className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-[0.8rem] font-bold ${on ? "bg-amber text-on-amber" : "bg-[rgba(255,255,255,0.88)] text-muted"}`}>
                  {on ? "✓" : "+"}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),transparent)] px-3 pb-2.5 pt-8 text-[0.8rem] font-semibold text-white">
                  {s.alias}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
