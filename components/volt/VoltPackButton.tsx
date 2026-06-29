"use client";

import { useState } from "react";

// Bottone "compra pacchetto": chiede al server una sessione di Stripe Checkout
// e ci porta. L'accredito dei VOLT avviene via webhook a pagamento confermato.
export function VoltPackButton({
  packId,
  label,
  popular,
}: {
  packId: string;
  label: string;
  popular?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/volt/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (res.ok && json?.url) {
        window.location.href = json.url;
        return; // niente reset: stiamo lasciando la pagina
      }
      setError(json?.error || "Pagamento non disponibile");
    } catch {
      setError("Errore di rete, riprova");
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={buy}
        disabled={loading}
        className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
          popular
            ? "bg-[#F2A93B] text-[#412402] hover:bg-[#E29A2E]"
            : "border border-border bg-white/[0.04] text-foreground hover:bg-white/[0.07]"
        }`}
      >
        {loading ? "Apro il pagamento..." : label}
      </button>
      {error && <p className="mt-2 text-[0.7rem] text-crimson">{error}</p>}
    </>
  );
}
