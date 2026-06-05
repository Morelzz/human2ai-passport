"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Report {
  id: string;
  target_type: "avatar" | "content";
  avatar_id: string | null;
  certificate: string | null;
  handle: string | null;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  status: string;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  no_consent: "Nessun consenso",
  impersonation: "Impersonazione",
  misuse: "Uso fuori categoria",
  illegal: "Contenuto illegale",
  other: "Altro",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReportsClient() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports");
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

  async function decide(id: string, action: "dismiss" | "uphold" | "suspend") {
    setBusy(id);
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: id, action, resolution: notes[id] ?? "" }),
    });
    setBusy(null);
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else { const j = await res.json().catch(() => ({})); setError(j.error ?? "Errore"); }
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <Link href="/account" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Account</Link>
      </nav>

      <section style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <span style={{ color: "#B8005C", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Segnalazioni di abuso</h1>
        <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Segnalazioni aperte sul registro. <strong style={{ color: "#9ca3af" }}>Sospendi</strong> rimuove
          l&apos;avatar dal registro pubblico (rimozione prospettica). <strong style={{ color: "#9ca3af" }}>Accogli</strong> chiude
          la segnalazione senza sospendere; <strong style={{ color: "#9ca3af" }}>Archivia</strong> la respinge.
        </p>

        {error && <p style={{ color: "#B8005C", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
        {loading ? (
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Caricamento…</p>
        ) : items.length === 0 ? (
          <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "#00A896", fontWeight: 700, margin: "0 0 0.3rem" }}>✓ Nessuna segnalazione aperta</p>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>La coda è vuota.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((r) => (
              <div key={r.id} style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                  <span style={{ background: "rgba(184,0,92,0.12)", border: "1px solid rgba(184,0,92,0.3)", color: "#B8005C", borderRadius: 999, padding: "0.2rem 0.7rem", fontSize: "0.72rem", fontWeight: 700 }}>
                    {REASON_LABEL[r.reason] ?? r.reason}
                  </span>
                  <span style={{ background: "rgba(107,33,232,0.1)", border: "1px solid rgba(107,33,232,0.3)", color: "#8b47f0", borderRadius: 999, padding: "0.2rem 0.7rem", fontSize: "0.72rem", fontWeight: 700 }}>
                    {r.target_type === "content" ? "Contenuto" : "Avatar"}
                  </span>
                  <span style={{ color: "#374151", fontSize: "0.78rem", marginLeft: "auto" }}>{formatDate(r.created_at)}</span>
                </div>

                {r.handle ? (
                  <Link href={`/passport/${r.handle}`} style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "1rem", textDecoration: "none" }}>
                    @{r.handle}
                  </Link>
                ) : (
                  <span style={{ color: "#6b7280", fontWeight: 700 }}>avatar rimosso</span>
                )}
                {r.certificate && (
                  <p style={{ color: "#374151", fontSize: "0.72rem", fontFamily: "monospace", margin: "0.3rem 0 0", wordBreak: "break-all" }}>
                    cert: {r.certificate}
                  </p>
                )}

                {r.details && (
                  <p style={{ color: "#9ca3af", fontSize: "0.86rem", lineHeight: 1.5, margin: "0.7rem 0 0", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
                    {r.details}
                  </p>
                )}
                {r.reporter_email && (
                  <p style={{ color: "#6b7280", fontSize: "0.76rem", margin: "0.5rem 0 0" }}>Ricontatto: {r.reporter_email}</p>
                )}

                <input
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="Nota di risoluzione (opzionale)…"
                  style={{ width: "100%", marginTop: "0.9rem", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f0f5", fontSize: "0.82rem", padding: "0.55rem 0.7rem", outline: "none", boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
                  <button onClick={() => decide(r.id, "dismiss")} disabled={busy === r.id}
                    style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#9ca3af", fontWeight: 700, fontSize: "0.82rem", cursor: busy === r.id ? "default" : "pointer" }}>
                    Archivia
                  </button>
                  <button onClick={() => decide(r.id, "uphold")} disabled={busy === r.id}
                    style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "1px solid rgba(0,168,150,0.4)", background: "transparent", color: "#00A896", fontWeight: 700, fontSize: "0.82rem", cursor: busy === r.id ? "default" : "pointer" }}>
                    Accogli
                  </button>
                  <button onClick={() => decide(r.id, "suspend")} disabled={busy === r.id || !r.avatar_id}
                    title={!r.avatar_id ? "Nessun avatar collegato" : "Accogli e rimuovi l'avatar dal registro"}
                    style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "none", background: busy === r.id || !r.avatar_id ? "#374151" : "#B8005C", color: busy === r.id || !r.avatar_id ? "#6b7280" : "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: busy === r.id || !r.avatar_id ? "not-allowed" : "pointer" }}>
                    {busy === r.id ? "…" : "Sospendi avatar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
