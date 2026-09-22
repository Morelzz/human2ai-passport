"use client";

import { useState } from "react";
import Link from "next/link";
import { riassunto, type Progetto } from "@/lib/progetti";

// LE CARTELLE, viste da chi ha fatto gli scatti. Si crea, si apre, si spegne il
// link. Tutto il resto (mettere e togliere scatti) sta dentro la cartella.

type Riga = Progetto & { quanti: number };

export function ProgettiClient({ iniziali, origin }: { iniziali: Riga[]; origin: string }) {
  const [righe, setRighe] = useState<Riga[]>(iniziali);
  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [copiato, setCopiato] = useState<string | null>(null);

  async function crea(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || busy) return;
    setBusy(true);
    setErrore(null);
    try {
      const r = await fetch("/api/progetti", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, cliente }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Non è stata creata.");
      setRighe([j.progetto, ...righe]);
      setNome("");
      setCliente("");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Non è stata creata.");
    } finally {
      setBusy(false);
    }
  }

  async function copia(p: Riga) {
    const url = `${origin}/p/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(p.id);
      setTimeout(() => setCopiato(null), 2000);
    } catch {
      window.prompt("Copia il link:", url);
    }
  }

  return (
    <>
      <form onSubmit={crea} className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.8rem] font-semibold text-muted">Nome della cartella</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
            placeholder="Campagna estate"
            className="focus-ring rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[0.95rem] outline-none"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.8rem] font-semibold text-muted">Per chi è (facoltativo)</span>
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            maxLength={80}
            placeholder="Nome del cliente"
            className="focus-ring rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[0.95rem] outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !nome.trim()}
          className="focus-ring h-[44px] shrink-0 rounded-full bg-amber px-5 text-[0.9rem] font-bold text-on-amber transition-colors hover:bg-amber-hover disabled:opacity-50"
        >
          {busy ? "Creo…" : "Nuova cartella"}
        </button>
      </form>
      {errore && <p className="mt-3 rounded-xl border border-blocked/30 bg-blocked-soft px-4 py-3 text-[0.88rem] text-on-blocked">{errore}</p>}

      {righe.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="text-[0.95rem] leading-relaxed text-muted">
            Ancora nessuna cartella. Una cartella raccoglie gli scatti di una campagna e si apre con un link che puoi
            mandare al tuo cliente: lui vede le foto, chi c&apos;è dentro e cosa ha autorizzato, senza bisogno di un account.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {righe.map((p) => (
            <div key={p.id} className="card flex flex-col gap-3 p-5">
              <div>
                <Link href={`/account/progetti/${p.id}`} className="text-[1.05rem] font-bold tracking-[-0.02em] hover:underline">
                  {p.nome}
                </Link>
                <p className="mt-0.5 text-[0.82rem] text-muted">{riassunto(p.quanti, p.cliente)}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {p.link_attivo ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/25 bg-verified-soft px-2.5 py-1 text-[0.72rem] font-bold text-on-verified">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-verified" /> Link acceso
                    </span>
                    <button
                      type="button"
                      onClick={() => copia(p)}
                      className="focus-ring rounded-full border border-border px-3 py-1 text-[0.76rem] font-semibold text-muted transition-colors hover:border-amber/60 hover:text-foreground"
                    >
                      {copiato === p.id ? "Copiato" : "Copia il link"}
                    </button>
                  </>
                ) : (
                  <span className="rounded-full border border-border px-2.5 py-1 text-[0.72rem] font-semibold text-faint">Link spento</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
