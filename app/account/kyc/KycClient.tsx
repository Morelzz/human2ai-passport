"use client";

import { useEffect, useState, useCallback } from "react";

// Coda KYC manuale: per ogni candidato l'operatore vede documento, selfie e
// foto (URL firmati temporanei dal bucket privato) e decide. La regola è una:
// documento, selfie e foto devono essere la STESSA persona.

interface PendingKyc {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  files: { name: string; url: string }[];
}

const FILE_LABEL: Record<string, string> = {
  document: "Documento",
  selfie: "Selfie",
};

function labelFor(name: string): string {
  const base = name.replace(/\.\w+$/, "");
  if (FILE_LABEL[base]) return FILE_LABEL[base];
  const m = base.match(/^photo-(\d+)$/);
  return m ? `Foto ${m[1]}` : base;
}

export default function KycClient() {
  const [items, setItems] = useState<PendingKyc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kyc");
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

  async function decide(userId: string, action: "approve" | "reject") {
    setBusy(userId);
    const res = await fetch("/api/admin/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action }),
    });
    setBusy(null);
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== userId));
    else { const j = await res.json().catch(() => ({})); setError(j.error ?? "Errore"); }
  }

  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <span style={{ color: "#00A896", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Verifiche identità (KYC)</h1>
      <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
        Persone in attesa di verifica. Approva solo se <strong>documento, selfie e foto sono la stessa persona</strong> e
        il documento è leggibile. I link alle immagini scadono dopo 10 minuti (ricarica la pagina se servono di nuovo).
      </p>

      {error && <p style={{ color: "#B8005C", fontSize: "0.85rem" }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Carico la coda…</p>}
      {!loading && items.length === 0 && !error && (
        <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#00A896", fontWeight: 700, margin: 0 }}>✓ Nessuna verifica in attesa</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {items.map((p) => (
          <div key={p.id} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <div>
                <p style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "1rem", margin: 0 }}>{p.full_name || "(senza nome)"}</p>
                <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0.15rem 0 0" }}>{p.email}</p>
              </div>
              <span style={{ color: "#374151", fontSize: "0.75rem" }}>
                candidatura del {new Date(p.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>

            {p.files.length === 0 ? (
              <p style={{ color: "#B8005C", fontSize: "0.82rem" }}>Nessun file trovato per questa candidatura.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.8rem", marginBottom: "1.2rem" }}>
                {p.files.map((f) => (
                  <a key={f.name} href={f.url} target="_blank" rel="noreferrer"
                    style={{ display: "block", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", background: "#12121a", textDecoration: "none" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={labelFor(f.name)} style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", display: "block", background: "#1c1c28" }} />
                    <span style={{ display: "block", padding: "0.4rem 0.6rem", color: "#6b7280", fontSize: "0.72rem", fontWeight: 600 }}>{labelFor(f.name)}</span>
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button onClick={() => decide(p.id, "approve")} disabled={busy === p.id}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, border: "1px solid rgba(0,168,150,0.4)", background: "rgba(0,168,150,0.12)", color: "#00d4be", fontWeight: 700, fontSize: "0.85rem", cursor: busy === p.id ? "default" : "pointer", opacity: busy === p.id ? 0.6 : 1 }}>
                ✓ Approva
              </button>
              <button onClick={() => decide(p.id, "reject")} disabled={busy === p.id}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, border: "1px solid rgba(184,0,92,0.4)", background: "rgba(184,0,92,0.1)", color: "#ff6aa5", fontWeight: 700, fontSize: "0.85rem", cursor: busy === p.id ? "default" : "pointer", opacity: busy === p.id ? 0.6 : 1 }}>
                ✕ Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
