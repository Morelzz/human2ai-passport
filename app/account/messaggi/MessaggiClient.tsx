"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Messaggio {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  created_at: string;
}

const SCHEDE = [
  { v: "open", l: "Da rispondere" },
  { v: "answered", l: "Risposti" },
  { v: "closed", l: "Chiusi" },
] as const;

// Le richieste privacy e legali hanno una scadenza (GDPR: un mese): stanno in cima.
const URGENTI = new Set(["Privacy", "Legale"]);

function quando(d: string) {
  return new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MessaggiClient() {
  const [scheda, setScheda] = useState<Messaggio["status"]>("open");
  const [items, setItems] = useState<Messaggio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/messages?stato=${scheda}`);
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Errore");
      else {
        const lista = (json.items ?? []) as Messaggio[];
        setItems([...lista.filter((m) => URGENTI.has(m.subject)), ...lista.filter((m) => !URGENTI.has(m.subject))]);
      }
    } catch {
      setError("Errore di rete");
    }
    setLoading(false);
  }, [scheda]);

  useEffect(() => { load(); }, [load]);

  async function segna(id: string, status: Messaggio["status"]) {
    setBusy(id);
    const res = await fetch("/api/admin/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setBusy(null);
    if (!res.ok) { setError("Aggiornamento non riuscito"); return; }
    setItems((l) => l.filter((m) => m.id !== id));
  }

  const risposta = (m: Messaggio) =>
    `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject} · Semblic`)}&body=${encodeURIComponent(`Ciao ${m.name},\n\n\n\n---\nIl tuo messaggio del ${quando(m.created_at)}:\n${m.message}`)}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <Link href="/account" className="kicker">← Account</Link>
      <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-[-0.03em]">Messaggi dal sito</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
        Quello che arriva dal modulo contatti. Le richieste Privacy e Legale stanno in cima: per il GDPR si risponde entro un mese.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {SCHEDE.map((s) => (
          <button
            key={s.v}
            type="button"
            role="tab"
            aria-selected={scheda === s.v}
            onClick={() => setScheda(s.v)}
            className={`h-10 rounded-full border px-4 text-[0.9rem] ${scheda === s.v ? "border-foreground bg-foreground font-semibold text-[var(--bg)]" : "border-border bg-surface"}`}
          >
            {s.l}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-[0.9rem] text-blocked">{error}</p>}
      {loading ? (
        <p className="mt-8 text-muted">Carico…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-muted">Nessun messaggio qui.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((m) => (
            <li key={m.id} className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-3 py-1 text-[0.78rem] font-semibold ${URGENTI.has(m.subject) ? "bg-blocked-soft text-on-blocked" : "bg-amber-soft text-on-amber"}`}>{m.subject}</span>
                <span className="text-[0.8rem] text-faint">{quando(m.created_at)}</span>
              </div>
              <p className="text-[0.95rem] font-semibold">
                {m.name} <span className="font-normal text-muted">· {m.email}</span>
              </p>
              <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-muted">{m.message}</p>
              <div className="flex flex-wrap gap-2">
                <a href={risposta(m)} className="inline-flex h-10 items-center rounded-full bg-amber px-4 text-[0.88rem] font-bold text-on-amber">Rispondi</a>
                {m.status !== "answered" && (
                  <button type="button" disabled={busy === m.id} onClick={() => segna(m.id, "answered")} className="h-10 rounded-full border border-border px-4 text-[0.88rem] font-semibold disabled:opacity-50">
                    Segna come risposto
                  </button>
                )}
                {m.status !== "closed" && (
                  <button type="button" disabled={busy === m.id} onClick={() => segna(m.id, "closed")} className="h-10 rounded-full px-3 text-[0.88rem] font-semibold text-muted hover:text-foreground disabled:opacity-50">
                    Chiudi
                  </button>
                )}
                {m.status !== "open" && (
                  <button type="button" disabled={busy === m.id} onClick={() => segna(m.id, "open")} className="h-10 rounded-full px-3 text-[0.88rem] font-semibold text-muted hover:text-foreground disabled:opacity-50">
                    Riapri
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
