"use client";

import { useEffect, useState } from "react";

// Pannello operatori: ancora l'identità di un avatar su Base.
// Mostra lo stato della configurazione blockchain (attiva solo con le env).
export default function AnchorPanel() {
  const [cfg, setCfg] = useState<{ configured: boolean; chain: string } | null>(null);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/anchor").then((r) => r.json()).then(setCfg).catch(() => setCfg({ configured: false, chain: "—" }));
  }, []);

  async function anchor() {
    if (!handle.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() }),
      });
      const j = await res.json();
      if (!res.ok) setMsg({ ok: false, text: j.error ?? "Errore" });
      else setMsg({ ok: true, text: `Ancorato su ${j.chain} · tx ${String(j.txHash).slice(0, 14)}…` });
    } catch {
      setMsg({ ok: false, text: "Errore di rete" });
    }
    setBusy(false);
  }

  return (
    <div style={{ background: "#11141D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
      <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 0.8rem" }}>ANCORAGGIO ON-CHAIN (BASE)</p>

      {!cfg ? (
        <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>Verifica configurazione…</p>
      ) : !cfg.configured ? (
        <p style={{ color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
          Blockchain non ancora configurata{cfg.chain ? ` (rete: ${cfg.chain})` : ""}. Imposta le env
          <span style={{ color: "#9ca3af" }}> BASE_RPC_URL, RELAYER_PRIVATE_KEY, IDENTITY_CONTRACT</span> e deploya i contratti (vedi docs/GO-LIVE.md).
        </p>
      ) : (
        <>
          <p style={{ color: "#00A896", fontSize: "0.78rem", fontWeight: 700, margin: "0 0 0.8rem" }}>● Attiva su {cfg.chain}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="handle avatar (es. random)"
              style={{ flex: 1, minWidth: 160, background: "#0C0F17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#F2E9D8", fontSize: "0.85rem", padding: "0.55rem 0.7rem", outline: "none" }} />
            <button onClick={anchor} disabled={busy || !handle.trim()}
              style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: busy || !handle.trim() ? "#374151" : "linear-gradient(135deg,#F2A93B,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: busy || !handle.trim() ? "default" : "pointer" }}>
              {busy ? "Ancoraggio…" : "Ancora"}
            </button>
          </div>
        </>
      )}

      {msg && <p style={{ color: msg.ok ? "#00A896" : "#B8005C", fontSize: "0.8rem", margin: "0.8rem 0 0" }}>{msg.text}</p>}
    </div>
  );
}
