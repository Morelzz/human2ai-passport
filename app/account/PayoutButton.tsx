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
      <p style={{ color: "rgba(242,233,216,0.45)", fontSize: "0.8rem", margin: 0 }}>
        Il payout si sblocca al raggiungimento della soglia.
      </p>
    );
  }

  return (
    <div>
      <button onClick={payout} disabled={busy}
        style={{ width: "100%", padding: "0.8rem", borderRadius: 10, border: "none", background: busy ? "#1E2530" : "#F2A93B", color: "#412402", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
        {busy ? "Elaborazione…" : `Richiedi payout di ${amount}`}
      </button>
      {error && <p style={{ color: "#EE7A70", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}
