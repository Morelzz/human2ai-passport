"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Form KYB self-serve: dati azienda -> /api/enterprise/register.
// Honeypot anti-bot; label associate (a11y). Allo stile di InquiryForm.
export default function RegisterOrgClient({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [vat, setVat] = useState("");
  const [country, setCountry] = useState("Italia");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [hp, setHp] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/enterprise/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, vat_number: vat, country, website, contact_email: email, website_hp: hp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Registrazione non riuscita, riprova");
        setSending(false);
        return;
      }
      // Successo: la dashboard /account ora mostra lo stato KYB.
      router.push("/account");
      router.refresh();
    } catch {
      setError("Registrazione non riuscita, riprova");
      setSending(false);
    }
  }

  const inp =
    "w-full rounded-xl border border-border bg-obsidian px-3.5 py-3 text-sm text-foreground outline-none transition-colors focus:border-violet/50 focus-ring";

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-4 rounded-[2rem] p-7 sm:p-8">
      <div>
        <label htmlFor="org-name" className="mb-1.5 block text-xs font-semibold text-muted">Ragione sociale *</label>
        <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="Es. Acme S.r.l." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="org-vat" className="mb-1.5 block text-xs font-semibold text-muted">Partita IVA / Reg. number *</label>
          <input id="org-vat" value={vat} onChange={(e) => setVat(e.target.value)} required className={inp} placeholder="Es. IT01234567890" />
        </div>
        <div>
          <label htmlFor="org-country" className="mb-1.5 block text-xs font-semibold text-muted">Paese *</label>
          <input id="org-country" value={country} onChange={(e) => setCountry(e.target.value)} required className={inp} placeholder="Es. Italia" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="org-website" className="mb-1.5 block text-xs font-semibold text-muted">Sito web <span className="font-normal text-faint">· opzionale</span></label>
          <input id="org-website" value={website} onChange={(e) => setWebsite(e.target.value)} className={inp} placeholder="https://azienda.it" />
        </div>
        <div>
          <label htmlFor="org-email" className="mb-1.5 block text-xs font-semibold text-muted">Email di contatto *</label>
          <input id="org-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inp} placeholder="ufficio@azienda.it" />
        </div>
      </div>

      {/* Honeypot: invisibile agli umani, i bot lo compilano */}
      <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" placeholder="website" />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 p-3.5 text-sm font-medium text-crimson">
          <span aria-hidden>⚠️</span><span>{error}</span>
        </div>
      )}

      <button type="submit" disabled={sending}
        className="mt-1 rounded-full bg-violet-light px-7 py-3.5 text-[0.74rem] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:brightness-110 disabled:opacity-50 focus-ring">
        {sending ? "Invio…" : "Invia per la verifica KYB"}
      </button>
      <p className="text-[0.68rem] leading-relaxed text-faint">
        Verifichiamo i dati manualmente, di solito entro 48 ore lavorative. Niente è pubblico finché non approviamo.
      </p>
    </form>
  );
}
