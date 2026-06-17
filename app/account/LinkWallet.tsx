"use client";

import { useState } from "react";

// Collega un wallet self-custody (Phantom o altro EVM) all'avatar.
// Usa solo eth_requestAccounts: legge l'indirizzo, non muove fondi né firma tx.
type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function getProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { phantom?: { ethereum?: Eip1193 }; ethereum?: Eip1193 };
  return w.phantom?.ethereum ?? w.ethereum ?? null;
}

export default function LinkWallet({ initialWallet, handle }: { initialWallet: string | null; handle?: string }) {
  const [wallet, setWallet] = useState<string | null>(initialWallet);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function connect() {
    setErr(null);
    const provider = getProvider();
    if (!provider) {
      setErr("Nessun wallet rilevato. Installa Phantom (o un wallet EVM) e riprova.");
      return;
    }
    setBusy(true);
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts?.[0];
      if (!addr) throw new Error("Nessun indirizzo");
      const res = await fetch("/api/avatar/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, handle }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Errore");
      setWallet(j.wallet);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connessione annullata");
    }
    setBusy(false);
  }

  const short = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : null;

  return (
    <div style={{ background: "#0C0F17", border: "1px solid rgba(242,169,59,0.25)", borderRadius: 12, padding: "1rem" }}>
      <p style={{ color: "#F2A93B", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 0.5rem" }}>
        WALLET DI PROPRIETÀ
      </p>
      {short ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#F2E9D8", fontSize: "0.85rem", fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00A896" }} />
            {short}
          </span>
          <button onClick={connect} disabled={busy}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#6b7280", borderRadius: 8, padding: "0.35rem 0.7rem", fontSize: "0.78rem", cursor: busy ? "default" : "pointer" }}>
            {busy ? "…" : "Cambia"}
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.5, margin: "0 0 0.8rem" }}>
            Collega il tuo wallet: quando ancoreremo l&apos;identità su Base, il token soulbound del tuo volto sarà mintato qui.
          </p>
          <button onClick={connect} disabled={busy}
            style={{ width: "100%", padding: "0.7rem", borderRadius: 10, border: "none", background: busy ? "#374151" : "linear-gradient(135deg,#F2A93B,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
            {busy ? "Connessione…" : "Collega wallet (Phantom)"}
          </button>
        </>
      )}
      {err && <p style={{ color: "#B8005C", fontSize: "0.76rem", margin: "0.6rem 0 0" }}>{err}</p>}
    </div>
  );
}
