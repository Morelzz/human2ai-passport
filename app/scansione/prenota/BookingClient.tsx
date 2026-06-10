"use client";

import { useState } from "react";
import Link from "next/link";
import type { Sede } from "@/lib/scan";

// H2 — form di prenotazione scansione. Slot semplici (data + ora piena,
// 10–18): la conferma dello slot è manuale finché non c'è un'agenda reale
// (stato "richiesta" → "confermata"). Honeypot anti-bot come gli altri form.

const HOURS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export function BookingClient({
  sedi,
  priceLabel,
  initialSede,
}: {
  sedi: Pick<Sede, "slug" | "name" | "city">[];
  priceLabel: string;
  initialSede?: string;
}) {
  const [sede, setSede] = useState(initialSede && sedi.some((s) => s.slug === initialSede) ? initialSede : sedi[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Da domani in poi (la sessione va preparata, niente prenotazioni per oggi).
  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/scan/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sede, name, email, phone, date, time, notes, website }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Invio non riuscito, riprova");
      else if (json.checkout_url) window.location.href = json.checkout_url; // Stripe attivo
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
          Grazie {name.split(" ")[0]}. Ti confermiamo data e ora a {email} — e ricorda:{" "}
          <span className="text-foreground">vieni come sei</span>.
        </p>
        <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-faint">
          Il pagamento ({priceLabel}) si salda in studio. Nel frattempo,{" "}
          <Link href="/scansione" className="text-violet-light underline">ripassa come prepararti</Link>.
        </p>
      </div>
    );
  }

  const inp = "w-full rounded-xl border border-white/10 bg-obsidian px-3.5 py-3 text-sm text-foreground outline-none transition-colors focus:border-violet/50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Sede *</label>
        <select value={sede} onChange={(e) => setSede(e.target.value)} required className={inp}>
          {sedi.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name} · {s.city}</option>
          ))}
        </select>
      </div>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Telefono <span className="font-normal text-faint">· opzionale</span></label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} placeholder="+39 …" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Data *</label>
          <input type="date" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} required className={inp} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Ora *</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} required className={inp}>
            <option value="">Seleziona…</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Note <span className="font-normal text-faint">· opzionale</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inp} resize-y`} placeholder="C'è qualcosa che dovremmo sapere?" />
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
        {sending ? "Invio…" : `Prenota la sessione · ${priceLabel}`}
      </button>
      <p className="text-[0.68rem] leading-relaxed text-faint">
        Slot soggetto a conferma: ti scriviamo noi. Oggi il pagamento si salda in studio
        (l&apos;online arriva a breve). Usiamo questi dati solo per la tua sessione —{" "}
        <Link href="/privacy" className="text-violet-light underline">privacy</Link>.
      </p>
    </form>
  );
}
