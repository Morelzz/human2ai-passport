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
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ full_name: fullName, role })
        .eq("id", data.user.id);
    }

    if (data.session) {
      router.push("/account");
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
          <Link href="/login" style={{ color: "#6B21E8" }}>accedi</Link>.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <Field label="Nome completo" value={fullName} onChange={setFullName} type="text" />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Password" value={password} onChange={setPassword} type="password" />

          <div>
            <label style={labelStyle}>Tipo di account</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["buyer", "seller"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    background: role === r ? "rgba(107,33,232,0.15)" : "#12121a",
                    color: role === r ? "#fff" : "#6b7280",
                    border: `1px solid ${role === r ? "#6B21E8" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {r === "buyer" ? "Compratore" : "Creatore"}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "#B8005C", fontSize: "0.8rem", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? "Creazione…" : "Crea account"}
          </button>

          <p style={{ color: "#6b7280", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
            Hai già un account?{" "}
            <Link href="/login" style={{ color: "#6B21E8" }}>Accedi</Link>
          </p>
        </form>
      )}
    </Shell>
  );
}
