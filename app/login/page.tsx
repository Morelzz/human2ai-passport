"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Field, Shell, submitClass, authErrorMessage } from "../auth-ui";

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
      setError(authErrorMessage(error.message));
      setLoading(false);
      return;
    }

    const dest = safeNext(new URLSearchParams(window.location.search).get("next")) ?? "/account";
    router.push(dest);
    router.refresh();
  }

  return (
    <Shell title="Accedi" subtitle="Bentornato nel registro dei volti.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />

        {error && <p role="alert" className="rounded-xl bg-blocked-soft px-3.5 py-2.5 text-[0.85rem] text-blocked">{error}</p>}

        <button type="submit" disabled={loading} className={submitClass(loading)}>
          {loading ? "Accesso…" : "Accedi"}
        </button>

        <p className="text-center text-[0.85rem] text-muted">
          Non hai un account?{" "}
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-semibold text-amber-ink hover:underline">Registrati</Link>
        </p>
      </form>
    </Shell>
  );
}
