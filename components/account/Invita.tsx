"use client";

import { useEffect, useState } from "react";

// LA SCHEDA "INVITA". Si carica da sola dopo la pagina: se gli inviti non sono
// ancora attivi (tabella non applicata) sparisce senza dire niente, invece di
// mostrare una cosa rotta.

interface Dati {
  codice: string;
  link: string;
  quanti: number;
  attivi: number;
  voltGuadagnati: number;
}

export function Invita() {
  const [d, setD] = useState<Dati | null>(null);
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/invito")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j?.codice) setD(j as Dati); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!d) return null;

  async function copia() {
    if (!d) return;
    try {
      await navigator.clipboard.writeText(d.link);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      window.prompt("Copia il link:", d.link);
    }
  }

  return (
    <div className="card bg-[radial-gradient(58%_46%_at_97%_-12%,var(--amber-soft),transparent_62%)] p-5">
      <p className="kicker">INVITA UN AMICO</p>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
        Chi entra col tuo link ti fa guadagnare il <strong className="text-foreground">20% in VOLT</strong> di ogni sua
        ricarica, per un anno. E lui prende il 10% in più sulla prima.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-[0.82rem]">{d.link}</code>
        <button
          type="button"
          onClick={copia}
          className="focus-ring shrink-0 rounded-full bg-amber px-4 py-2.5 text-[0.85rem] font-bold text-on-amber transition-colors hover:bg-amber-hover"
        >
          {copiato ? "Copiato" : "Copia"}
        </button>
      </div>

      {d.quanti > 0 && (
        <div className="mt-4 flex flex-col">
          <Riga k="Persone entrate col tuo link" v={String(d.quanti)} />
          <Riga k="Di cui hanno già ricaricato" v={String(d.attivi)} />
          <Riga k="VOLT guadagnati" v={`⚡ ${d.voltGuadagnati.toLocaleString("it-IT")}`} />
        </div>
      )}

      <p className="mt-3 text-[0.72rem] leading-relaxed text-faint">
        Il premio arriva quando la persona ricarica davvero, non quando apre l&apos;account.
      </p>
    </div>
  );
}

function Riga({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2 text-[0.85rem] first:border-t-0">
      <span className="text-muted">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
