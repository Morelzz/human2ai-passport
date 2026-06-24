"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Field, Shell, labelStyle, submitStyle, passwordIssue } from "../auth-ui";
import { isAdult } from "@/lib/age";

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
      setError(error.message);
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
    <Shell title="Crea il tuo account">
      {blockedUnderage ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--blocked-c)", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.6rem" }}>
            SEMBLIC e' riservato ai maggiorenni
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
            In base alla data di nascita inserita non possiamo creare il tuo account. SEMBLIC custodisce volti di persone reali e l'accesso e' consentito solo dai 18 anni.
          </p>
        </div>
      ) : done ? (
        <p style={{ color: "var(--verified-c)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Account creato. Controlla la tua email per confermare, poi{" "}
          <Link href="/login" style={{ color: "#F2A93B" }}>accedi</Link>
          {accountType === "enterprise" ? " e completa la registrazione della tua azienda." : "."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <Field label="Nome completo" value={fullName} onChange={setFullName} type="text" />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Password" value={password} onChange={setPassword} type="password" />

          <div>
            <label style={labelStyle}>Data di nascita</label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} required
                style={{ flex: "0 0 64px", padding: "0.7rem 0.5rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "var(--text)", fontSize: "0.85rem" }}>
                <option value="">GG</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={String(d)}>{d}</option>)}
              </select>
              <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} required
                style={{ flex: 1, padding: "0.7rem 0.5rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "var(--text)", fontSize: "0.85rem" }}>
                <option value="">Mese</option>
                {["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"].map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
              </select>
              <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} required
                style={{ flex: "0 0 90px", padding: "0.7rem 0.5rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "var(--text)", fontSize: "0.85rem" }}>
                <option value="">AAAA</option>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <p style={{ color: "var(--verified-c)", fontSize: "0.72rem", margin: "0.45rem 0 0", lineHeight: 1.5 }}>
              Devi avere almeno 18 anni per usare SEMBLIC.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Tipo di account</label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {(["buyer", "seller", "enterprise"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAccountType(r)}
                  style={{
                    flex: 1,
                    padding: "0.55rem 0.4rem",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    background: accountType === r ? "rgba(242,169,59,0.15)" : "var(--surface)",
                    color: accountType === r ? "var(--text)" : "var(--text-muted)",
                    border: `1px solid ${accountType === r ? "#F2A93B" : "var(--hairline-soft)"}`,
                  }}
                >
                  {r === "buyer" ? "Compratore" : r === "seller" ? "Creatore" : "Azienda"}
                </button>
              ))}
            </div>
            {/* Una riga d'aiuto: cosa significano i 3 tipi, senza sovraccaricare. */}
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
              {accountType === "buyer"
                ? "Compri e generi con i volti del registro."
                : accountType === "seller"
                ? "Metti il tuo volto nel registro e guadagni a ogni utilizzo."
                : "Registri la tua agenzia per gestire più volti (con verifica azienda)."}
            </p>
          </div>

          {error && <p style={{ color: "var(--blocked-c)", fontSize: "0.8rem", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? "Creazione…" : "Crea account"}
          </button>

          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
            Hai già un account?{" "}
            <Link href="/login" style={{ color: "#F2A93B" }}>Accedi</Link>
          </p>
        </form>
      )}
    </Shell>
  );
}
