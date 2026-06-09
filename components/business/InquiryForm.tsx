"use client";

import { useState } from "react";

// B4/B2 — form di richiesta commerciale condiviso (kind: studio | enterprise).
// Stessi campi, copy adattabile via prop. Honeypot anti-bot invisibile.
const BUDGETS = ["< 1.000 €", "1.000–5.000 €", "5.000–20.000 €", "> 20.000 €", "Da definire"];

export function InquiryForm({
  kind,
  messageLabel,
  messagePlaceholder,
  cta,
}: {
  kind: "studio" | "enterprise";
  messageLabel: string;
  messagePlaceholder: string;
  cta: string;
}) {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
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
      const res = await fetch("/api/business/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, company, name, email, budget, message, website }),
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
        <p className="text-lg font-bold text-teal">✓ Richiesta ricevuta</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Grazie {name.split(" ")[0]}. Ti rispondiamo a {email} entro 48 ore lavorative.
        </p>
      </div>
    );
  }

  const inp = "w-full rounded-xl border border-white/10 bg-obsidian px-3.5 py-3 text-sm text-foreground outline-none transition-colors focus:border-violet/50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Azienda / brand *</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} required className={inp} placeholder="Es. Acme S.r.l." />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Nome e cognome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="Es. Laura Conti" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Email di lavoro *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inp} placeholder="nome@azienda.it" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Budget indicativo <span className="font-normal text-faint">· opzionale</span></label>
          <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inp}>
            <option value="">Seleziona…</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">{messageLabel} *</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} className={`${inp} resize-y`} placeholder={messagePlaceholder} />
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
        {sending ? "Invio…" : cta}
      </button>
      <p className="text-[0.68rem] leading-relaxed text-faint">
        Usiamo questi dati solo per risponderti. Niente spam, niente cessioni.
      </p>
    </form>
  );
}
