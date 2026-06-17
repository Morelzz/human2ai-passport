"use client";

import { useCallback, useEffect, useState } from "react";

interface PendingOrg {
  id: string;
  name: string;
  vat_number: string | null;
  country: string | null;
  website: string | null;
  contact_email: string | null;
  kyb_submitted_at: string | null;
  created_at: string;
}

export default function KybReviewClient() {
  const [items, setItems] = useState<PendingOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kyb");
      const json = await res.json();
      setLoading(false);
      if (!res.ok) { setError(json.error ?? "Errore"); return; }
      setItems(json.items ?? []);
    } catch {
      setLoading(false);
      setError("Errore di rete");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Motivo del rifiuto (facoltativo, resta interno):") ?? "";
    }
    setBusy(id);
    const res = await fetch("/api/admin/kyb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: id, action, reason }),
    });
    setBusy(null);
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else { const j = await res.json().catch(() => ({})); setError(j.error ?? "Errore"); }
  }

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <span style={{ color: "#EE7A70", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Verifiche aziende (KYB)</h1>
      <p style={{ color: "rgba(242,233,216,0.70)", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
        Aziende che hanno chiesto l&apos;accesso enterprise. Verifica ragione sociale, partita IVA e
        sito prima di approvare: solo dopo l&apos;azienda potrà onboardare il proprio roster.
      </p>

      {error && <p style={{ color: "#EE7A70", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
      {loading ? (
        <p style={{ color: "rgba(242,233,216,0.70)", fontSize: "0.9rem" }}>Caricamento…</p>
      ) : items.length === 0 ? (
        <div style={{ background: "#141A24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#7FAE96", fontWeight: 700, margin: "0 0 0.3rem" }}>✓ Nessuna azienda in attesa</p>
          <p style={{ color: "rgba(242,233,216,0.70)", fontSize: "0.85rem", margin: 0 }}>La coda è vuota.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((o) => (
            <div key={o.id} style={{ background: "#141A24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.3rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>{o.name}</div>
                <div style={{ color: "rgba(242,233,216,0.70)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                  {[o.vat_number, o.country].filter(Boolean).join(" · ") || "—"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  {o.website && (
                    <a href={o.website.startsWith("http") ? o.website : `https://${o.website}`} target="_blank" rel="noreferrer noopener"
                      style={{ color: "#F2A93B", fontSize: "0.78rem", textDecoration: "none", wordBreak: "break-all" }}>
                      {o.website} ↗
                    </a>
                  )}
                  {o.contact_email && <span style={{ color: "rgba(242,233,216,0.45)", fontSize: "0.76rem" }}>{o.contact_email}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => decide(o.id, "reject")} disabled={busy === o.id}
                  style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "1px solid rgba(238,122,112,0.4)", background: "transparent", color: "#EE7A70", fontWeight: 700, fontSize: "0.82rem", cursor: busy === o.id ? "default" : "pointer" }}>
                  Rifiuta
                </button>
                <button onClick={() => decide(o.id, "approve")} disabled={busy === o.id}
                  style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "none", background: busy === o.id ? "#1E2530" : "#7FAE96", color: busy === o.id ? "rgba(242,233,216,0.70)" : "#16352A", fontWeight: 800, fontSize: "0.82rem", cursor: busy === o.id ? "not-allowed" : "pointer" }}>
                  {busy === o.id ? "…" : "Approva"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
