"use client";

// Componenti UI condivisi tra /login e /signup.
// Casa nuova: campi a 16px (niente zoom forzato su iPhone), bordo che si accende
// al focus, pulsante a pillola come nel resto del sito.
import { useId } from "react";
import Link from "next/link";
import { Logo } from "@/app/Nav";

export const labelClass = "mb-1.5 block text-[0.8rem] font-medium text-muted";

// Stile unico per input e select dei form di accesso.
export const inputClass =
  "w-full rounded-xl border border-edge bg-surface px-3.5 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-amber focus:shadow-[0_0_0_4px_rgba(226,154,46,0.16)]";

export function Field({ label, value, onChange, type, autoComplete }: { label: string; value: string; onChange: (v: string) => void; type: string; autoComplete?: string }) {
  // useId: label e input associati per l'accessibilita' (screen reader).
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete ?? (type === "email" ? "email" : type === "password" ? "current-password" : type === "text" ? "name" : undefined)}
        required
        className={inputClass}
      />
    </div>
  );
}

export function submitClass(loading: boolean): string {
  return `mt-1 w-full rounded-full px-6 py-3.5 text-[0.95rem] font-semibold transition-colors focus-ring ${
    loading ? "cursor-default bg-[var(--hairline)] text-muted" : "bg-amber text-on-amber hover:bg-amber-hover"
  }`;
}

// I messaggi di Supabase Auth arrivano in inglese: i piu' comuni in italiano,
// gli altri con una frase generica (mai il testo tecnico grezzo).
export function authErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o password non corretti.";
  if (m.includes("email not confirmed")) return "Conferma prima l'email: ti abbiamo scritto un link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Esiste già un account con questa email. Accedi.";
  if (m.includes("rate limit") || m.includes("too many")) return "Troppi tentativi, riprova tra qualche minuto.";
  if (m.includes("password") && m.includes("weak")) return "Password troppo debole: usane una più lunga e varia.";
  if (m.includes("invalid email") || m.includes("email address") && m.includes("invalid")) return "Controlla l'indirizzo email.";
  return "Qualcosa non è andato, riprova.";
}

// Coerente con la policy server di Supabase Auth. Ritorna un messaggio d'errore
// in italiano, o null se la password va bene. Validazione lato UX: la verita'
// e' comunque lato server (Auth + leaked-password protection).
export function passwordIssue(pw: string): string | null {
  if (pw.length < 10) return "La password deve avere almeno 10 caratteri";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return "Servono lettere maiuscole e minuscole";
  if (!/[0-9]/.test(pw)) return "Serve almeno un numero";
  return null;
}

// L'ingresso (27/9 notte): sul computer a sinistra il set al buio della prima
// pagina, con le tre promesse; a destra il modulo. Sul telefono solo il modulo.
// Niente foto di persone qui: e' una pagina che non legge il consenso vivo.
export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(460px,600px)]">
      <aside data-theme="dark" className="relative m-3 hidden overflow-hidden rounded-[28px] bg-[#0E0C09] p-12 text-[#F4EEE3] lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(rgba(244,238,227,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(244,238,227,0.045) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_70%,rgba(226,154,46,0.16),transparent_70%)]" />
        <span aria-hidden className="ingresso-riga" />
        <div className="relative w-fit"><Logo size={26} /></div>
        <div className="relative">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#E29A2E]">Il registro dei volti</p>
          <p className="mt-4 max-w-[13ch] text-[4.2rem] font-bold leading-[0.92] tracking-[-0.055em]">Ogni volto qui ha detto sì.</p>
          <ul className="mt-8 flex flex-col gap-2.5 font-mono text-[0.82rem] text-white/70">
            {["il consenso si legge prima di ogni scatto", "ogni file esce con il suo certificato", "la persona viene pagata a ogni uso"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#3DDC97] shadow-[0_0_8px_#3DDC97]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="relative z-[2] mb-7 lg:hidden">
          <Logo size={26} />
        </div>
        <div className="card relative z-[2] w-full max-w-[420px] rounded-3xl p-6 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.03em] lg:text-[2.6rem] lg:tracking-[-0.045em]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted lg:text-[1rem]">{subtitle}</p>}
          <div className="mt-6 lg:mt-8">{children}</div>
        </div>
        <Link href="/" className="relative z-[2] mt-6 text-[0.85rem] text-muted transition-colors hover:text-foreground">
          Torna al sito
        </Link>
      </div>
    </div>
  );
}
