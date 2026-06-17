"use client";

import { useState } from "react";

// B1 — form di candidatura Capture Partner. Campi dal doc: nome, città,
// portfolio, email (+ messaggio opzionale). Honeypot anti-bot invisibile.
export function ApplyForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [portfolio, setPortfolio] = useState("");
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
      const res = await fetch("/api/partner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, email, portfolio, message, website }),
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
        <p className="text-lg font-bold text-teal">✓ Candidatura ricevuta</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Grazie {name.split(" ")[0]}. I primi partner verranno contattati per il percorso
          di certificazione, ti scriviamo a {email}.
        </p>
      </div>
    );
  }

  const inp = "w-full rounded-xl border border-white/10 bg-obsidian px-3.5 py-3 text-sm text-foreground outline-none transition-colors focus:border-violet/50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ap-name" className="mb-1.5 block text-xs font-semibold text-muted">Nome e cognome *</label>
          <input id="ap-name" value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="Es. Giulia Ferri" />
        </div>
        <div>
          <label htmlFor="ap-city" className="mb-1.5 block text-xs font-semibold text-muted">Città *</label>
          <input id="ap-city" value={city} onChange={(e) => setCity(e.target.value)} required className={inp} placeholder="Es. Bologna" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ap-email" className="mb-1.5 block text-xs font-semibold text-muted">Email *</label>
          <input id="ap-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inp} placeholder="nome@studio.it" />
        </div>
        <div>
          <label htmlFor="ap-portfolio" className="mb-1.5 block text-xs font-semibold text-muted">Portfolio <span className="font-normal text-faint">· sito o profilo</span></label>
          <input id="ap-portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} className={inp} placeholder="https://…" />
        </div>
      </div>
      <div>
        <label htmlFor="ap-message" className="mb-1.5 block text-xs font-semibold text-muted">Raccontaci di te <span className="font-normal text-faint">· opzionale</span></label>
        <textarea id="ap-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={`${inp} resize-y`} placeholder="Che lavoro fai, che attrezzatura usi, perché ti interessa…" />
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
        className="mt-1 rounded-xl bg-[linear-gradient(135deg,#F2A93B,#B8005C)] px-6 py-3.5 text-sm font-bold text-[#0C0F17] shadow-[0_8px_40px_rgba(242,169,59,0.3)] transition-all hover:brightness-110 disabled:opacity-50">
        {sending ? "Invio…" : "Candidati come Capture Partner"}
      </button>
      <p className="text-[0.68rem] leading-relaxed text-faint">
        Usiamo questi dati solo per ricontattarti sul programma partner. Niente spam, niente cessioni.
      </p>
    </form>
  );
}
