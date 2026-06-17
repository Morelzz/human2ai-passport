"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Field, Shell, labelStyle, submitStyle } from "../auth-ui";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"buyer" | "seller" | "enterprise">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    // Il trigger handle_new_user accetta solo buyer/seller: l'azienda nasce
    // "buyer" e l'intento enterprise viaggia nel metadata, poi il form KYB
    // (/enterprise/register) la promuove a enterprise. Zero migrazioni.
    const isEnterprise = accountType === "enterprise";
    const role = isEnterprise ? "buyer" : accountType;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, ...(isEnterprise ? { account_intent: "enterprise" } : {}) } },
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
      // Azienda: dritti al form KYB (l'org si crea lì). Gli altri all'account.
      router.push(isEnterprise ? "/enterprise/register" : "/account");
      router.refresh();
    } else {
      setDone(true);
      setLoading(false);
    }
  }

  return (
    <Shell title="Crea il tuo account">
      {done ? (
        <p style={{ color: "#00A896", fontSize: "0.9rem", lineHeight: 1.6 }}>
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
                    background: accountType === r ? "rgba(242,169,59,0.15)" : "#161A24",
                    color: accountType === r ? "#fff" : "#6b7280",
                    border: `1px solid ${accountType === r ? "#F2A93B" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {r === "buyer" ? "Compratore" : r === "seller" ? "Creatore" : "Azienda"}
                </button>
              ))}
            </div>
            {/* Una riga d'aiuto: cosa significano i 3 tipi, senza sovraccaricare. */}
            <p style={{ color: "#6b7280", fontSize: "0.72rem", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
              {accountType === "buyer"
                ? "Compri e generi con i volti del registro."
                : accountType === "seller"
                ? "Metti il tuo volto nel registro e guadagni a ogni utilizzo."
                : "Registri la tua agenzia per gestire più volti (con verifica azienda)."}
            </p>
          </div>

          {error && <p style={{ color: "#B8005C", fontSize: "0.8rem", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? "Creazione…" : "Crea account"}
          </button>

          <p style={{ color: "#6b7280", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
            Hai già un account?{" "}
            <Link href="/login" style={{ color: "#F2A93B" }}>Accedi</Link>
          </p>
        </form>
      )}
    </Shell>
  );
}
