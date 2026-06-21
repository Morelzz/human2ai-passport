"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Field, Shell, submitStyle } from "../auth-ui";

// Accetta solo path interni (niente open redirect): "/x" si', "//x" o "http..." no.
function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Destinazione post-login: i flussi gated (es. /signup/avatar) passano ?next=
  // per riportare l'utente dove stava dopo l'accesso.
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => { setNext(safeNext(new URLSearchParams(window.location.search).get("next"))); }, []);

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

    const dest = safeNext(new URLSearchParams(window.location.search).get("next")) ?? "/account";
    router.push(dest);
    router.refresh();
  }

  return (
    <Shell title="Accedi">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />

        {error && <p style={{ color: "var(--blocked-c)", fontSize: "0.8rem", margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={submitStyle(loading)}>
          {loading ? "Accesso…" : "Accedi"}
        </button>

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
          Non hai un account?{" "}
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} style={{ color: "#F2A93B" }}>Registrati</Link>
        </p>
      </form>
    </Shell>
  );
}
