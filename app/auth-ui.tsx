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

export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-foreground">
      <div className="relative z-[2] mb-7">
        <Logo size={26} />
      </div>
      <div className="card relative z-[2] w-full max-w-[400px] rounded-3xl p-6 sm:p-8">
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <Link href="/" className="relative z-[2] mt-6 text-[0.85rem] text-muted transition-colors hover:text-foreground">
        Torna al sito
      </Link>
    </div>
  );
}
