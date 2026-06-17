"use client";

import { useEffect, useState, useCallback } from "react";

interface PendingAvatar {
  id: string;
  handle: string;
  alias: string;
  gender: string | null;
  age_range: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  created_at: string;
  person_consented_at: string | null;
}

export default function ReviewClient() {
  const [items, setItems] = useState<PendingAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/review");
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
    setBusy(id);
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_id: id, action }),
    });
    setBusy(null);
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else { const j = await res.json().catch(() => ({})); setError(j.error ?? "Errore"); }
  }

  return (
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <span style={{ color: "#B8005C", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Coda di revisione</h1>
        <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Avatar onboardati da organizzazioni, in attesa di verifica. Approva solo se l&apos;identità
          è coerente (documento, selfie e foto della stessa persona). Solo gli approvati vanno live.
        </p>

        {error && <p style={{ color: "#B8005C", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
        {loading ? (
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Caricamento…</p>
        ) : items.length === 0 ? (
          <div style={{ background: "#161A24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "#00A896", fontWeight: 700, margin: "0 0 0.3rem" }}>✓ Nessun avatar in attesa</p>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>La coda è vuota.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((a) => (
              <div key={a.id} style={{ background: "#161A24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.3rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>{a.alias}</div>
                  <div style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: "0.4rem" }}>@{a.handle}</div>
                  <div style={{ color: "#374151", fontSize: "0.76rem", marginBottom: "0.4rem" }}>
                    {[a.gender, a.age_range, a.ethnicity, a.hair_color].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {a.person_consented_at ? (
                    <span style={{ color: "#00A896", fontSize: "0.72rem", fontWeight: 700 }}>● consenso persona confermato</span>
                  ) : (
                    <span style={{ color: "#B8005C", fontSize: "0.72rem", fontWeight: 700 }}>● in attesa del consenso della persona</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => decide(a.id, "reject")} disabled={busy === a.id}
                    style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "1px solid rgba(184,0,92,0.4)", background: "transparent", color: "#B8005C", fontWeight: 700, fontSize: "0.82rem", cursor: busy === a.id ? "default" : "pointer" }}>
                    Rifiuta
                  </button>
                  <button onClick={() => decide(a.id, "approve")} disabled={busy === a.id || !a.person_consented_at}
                    title={!a.person_consented_at ? "La persona non ha ancora confermato il consenso" : ""}
                    style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "none", background: busy === a.id || !a.person_consented_at ? "#374151" : "#00A896", color: busy === a.id || !a.person_consented_at ? "#6b7280" : "#06231f", fontWeight: 800, fontSize: "0.82rem", cursor: busy === a.id || !a.person_consented_at ? "not-allowed" : "pointer" }}>
                    {busy === a.id ? "…" : "Approva"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
  );
}
