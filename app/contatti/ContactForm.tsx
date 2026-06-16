"use client";

import { useState } from "react";
import Link from "next/link";

// F2 — form contatti pubblico: nome, email, oggetto (select), messaggio.
// Honeypot anti-bot invisibile, microcopy privacy sotto il bottone.
const SUBJECTS = ["Sono un brand", "Voglio mettere il mio volto", "Stampa", "Partner", "Legale", "Altro"];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Invio non riuscito, riprova");
      else setDone(true);
    } catch {
      setError("Invio non riuscito, riprova");
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className="glass rounded-2xl border-teal/30 p-8 text-center">
        <p className="text-lg font-bold text-teal">✓ Messaggio ricevuto</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Grazie {name.split(" ")[0]}. Ti rispondiamo a {email} il prima possibile.
        </p>
      </div>
    );
  }

  const inp = "w-full rounded-xl border border-white/10 bg-obsidian px-3.5 py-3 text-sm text-foreground outline-none transition-colors focus:border-violet/50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Nome e cognome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="Es. Laura Conti" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inp} placeholder="nome@esempio.it" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Oggetto *</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} required className={inp}>
          <option value="">Seleziona…</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Messaggio *</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className={`${inp} resize-y`} placeholder="Raccontaci cosa ti serve…" />
      </div>

      {/* Honeypot: invisibile agli umani, i bot lo compilano */}
      <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" placeholder="website" />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 p-3.5 text-sm font-medium text-crimson">
          <span aria-hidden>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button type="submit" disabled={sending}
        className="mt-1 rounded-full bg-violet-light px-7 py-3.5 text-[0.74rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:brightness-110 disabled:opacity-50">
        {sending ? "Invio…" : "Invia il messaggio"}
      </button>
      <p className="text-[0.68rem] leading-relaxed text-faint">
        Usiamo questi dati solo per risponderti. Niente spam, niente cessioni,{" "}
        <Link href="/privacy" className="text-violet-light underline">informativa privacy</Link>.
      </p>
    </form>
  );
}
