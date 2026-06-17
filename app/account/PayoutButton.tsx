"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PayoutButton({ eligible, amount }: { eligible: boolean; amount: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payout() {
    if (!confirm(`Richiedere il payout di ${amount}? (simulato)`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/payout", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    router.refresh();
  }

  if (!eligible) {
    return (
      <p style={{ color: "#374151", fontSize: "0.8rem", margin: 0 }}>
        Il payout si sblocca al raggiungimento della soglia.
      </p>
    );
  }

  return (
    <div>
      <button onClick={payout} disabled={busy}
        style={{ width: "100%", padding: "0.8rem", borderRadius: 10, border: "none", background: busy ? "#374151" : "linear-gradient(135deg,#F2A93B,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
        {busy ? "Elaborazione…" : `Richiedi payout di ${amount}`}
      </button>
      {error && <p style={{ color: "#B8005C", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}
