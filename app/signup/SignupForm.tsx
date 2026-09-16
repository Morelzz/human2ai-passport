"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Field, Shell, labelClass, inputClass, submitClass, passwordIssue, authErrorMessage } from "../auth-ui";
import { isAdult } from "@/lib/age";
import { cn } from "@/lib/utils";

// Accetta solo path interni (niente open redirect).
function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"buyer" | "seller" | "enterprise">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [blockedUnderage, setBlockedUnderage] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Data di nascita autodichiarata: la componiamo come YYYY-MM-DD.
    if (!dobDay || !dobMonth || !dobYear) {
      setError("Inserisci la tua data di nascita");
      setLoading(false);
      return;
    }
    const dob = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;
    if (!isAdult(dob, new Date())) {
      // Strato 1 (UX): schermata di blocco. Il trigger e' la garanzia dietro.
      setBlockedUnderage(true);
      setLoading(false);
      return;
    }

    // Validazione robustezza password lato UX (coerente con la policy Auth server).
    const pwErr = passwordIssue(password);
    if (pwErr) { setError(pwErr); setLoading(false); return; }

    const supabase = createClient();
    // Il trigger handle_new_user accetta solo buyer/seller: l'azienda nasce
    // "buyer" e l'intento enterprise viaggia nel metadata, poi il form KYB
    // (/enterprise/register) la promuove a enterprise. Zero migrazioni.
    const isEnterprise = accountType === "enterprise";
    const role = isEnterprise ? "buyer" : accountType;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, date_of_birth: dob, ...(isEnterprise ? { account_intent: "enterprise" } : {}) } },
    });

    if (error) {
      setError(authErrorMessage(error.message));
      setLoading(false);
      return;
    }

    // role e full_name viaggiano nel metadata (options.data): il trigger
    // handle_new_user popola il profilo alla creazione utente, robusto anche con
    // la conferma email attiva (qui non c'e' sessione per fare un UPDATE sotto RLS).
    if (data.session) {
      // Azienda: dritti al form KYB (l'org si crea lì). Gli altri a ?next (i
      // flussi gated come /signup/avatar lo portano fin qui) oppure all'account.
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.push(isEnterprise ? "/enterprise/register" : (next ?? "/account"));
      router.refresh();
    } else {
      setDone(true);
      setLoading(false);
    }
  }

  return (
    <Shell title="Crea il tuo account" subtitle="Genera con volti veri, o metti il tuo e guadagna a ogni utilizzo.">
      {blockedUnderage ? (
        <div className="text-center">
          <p className="mb-2.5 text-base font-bold text-blocked">
            SEMBLIC è riservato ai maggiorenni
          </p>
          <p className="text-[0.9rem] leading-relaxed text-muted">
            In base alla data di nascita inserita non possiamo creare il tuo account. SEMBLIC custodisce volti di persone reali e l'accesso è consentito solo dai 18 anni.
          </p>
        </div>
      ) : done ? (
        <p className="rounded-xl bg-verified-soft px-4 py-3 text-[0.9rem] leading-relaxed text-verified">
          Account creato. Controlla la tua email per confermare, poi{" "}
          <Link href="/login" className="font-semibold text-amber-ink hover:underline">accedi</Link>
          {accountType === "enterprise" ? " e completa la registrazione della tua azienda." : "."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome completo" value={fullName} onChange={setFullName} type="text" />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="new-password" />

          <div>
            <label className={labelClass}>Data di nascita</label>
            <div className="flex gap-2">
              <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} required aria-label="Giorno"
                className={cn(inputClass, "w-[4.6rem] shrink-0 px-2.5")}>
                <option value="">GG</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={String(d)}>{d}</option>)}
              </select>
              <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} required aria-label="Mese"
                className={cn(inputClass, "min-w-0 flex-1 px-2.5")}>
                <option value="">Mese</option>
                {["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"].map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
              </select>
              <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} required aria-label="Anno"
                className={cn(inputClass, "w-[5.8rem] shrink-0 px-2.5")}>
                <option value="">AAAA</option>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <p className="mt-1.5 text-[0.78rem] leading-snug text-faint">
              Devi avere almeno 18 anni per usare SEMBLIC.
            </p>
          </div>

          <div>
            <label className={labelClass}>Tipo di account</label>
            <div className="grid grid-cols-3 gap-1 rounded-full border border-edge bg-surface p-1">
              {(["buyer", "seller", "enterprise"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAccountType(r)}
                  aria-pressed={accountType === r}
                  className={`rounded-full px-2 py-2 text-[0.82rem] font-semibold transition-colors focus-ring ${
                    accountType === r ? "bg-amber-soft text-amber-ink" : "text-muted hover:text-foreground"
                  }`}
                >
                  {r === "buyer" ? "Genero" : r === "seller" ? "Il mio volto" : "Azienda"}
                </button>
              ))}
            </div>
            {/* Una riga d'aiuto: cosa significano i 3 tipi, senza sovraccaricare. */}
            <p className="mt-2 text-[0.8rem] leading-snug text-muted">
              {accountType === "buyer"
                ? "Compri e generi con i volti del registro."
                : accountType === "seller"
                ? "Metti il tuo volto nel registro e guadagni a ogni utilizzo."
                : "Registri la tua agenzia per gestire più volti (con verifica azienda)."}
            </p>
          </div>

          {error && <p role="alert" className="rounded-xl bg-blocked-soft px-3.5 py-2.5 text-[0.85rem] text-blocked">{error}</p>}

          <button type="submit" disabled={loading} className={submitClass(loading)}>
            {loading ? "Creazione…" : "Crea account"}
          </button>

          <p className="text-center text-[0.85rem] text-muted">
            Hai già un account?{" "}
            <Link href="/login" className="font-semibold text-amber-ink hover:underline">Accedi</Link>
          </p>
        </form>
      )}
    </Shell>
  );
}
