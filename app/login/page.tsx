"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Field, Shell, submitStyle } from "../auth-ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <Shell title="Accedi">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />

        {error && <p style={{ color: "#B8005C", fontSize: "0.8rem", margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={submitStyle(loading)}>
          {loading ? "Accesso…" : "Accedi"}
        </button>

        <p style={{ color: "#6b7280", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
          Non hai un account?{" "}
          <Link href="/signup" style={{ color: "#6B21E8" }}>Registrati</Link>
        </p>
      </form>
    </Shell>
  );
}
