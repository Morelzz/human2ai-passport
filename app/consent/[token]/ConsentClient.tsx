"use client";

import { useState } from "react";

interface Props {
  token: string;
  alias: string;
  identity: string;
  categories: string[];
  alreadyConsented: boolean;
}

export default function ConsentClient({ token, alias, identity, categories, alreadyConsented }: Props) {
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyConsented);

  async function confirm() {
    if (!agreed) { setError("Devi accettare i termini"); return; }
    if (signature.trim().length < 2) { setError("Firma con il tuo nome"); return; }
    setLoading(true); setError(null);
    const res = await fetch(`/api/consent/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature: signature.trim() }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setDone(true);
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifyContent: "center", marginBottom: "2rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ fontSize: "0.85rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </div>

        {done ? (
          <div style={{ background: "#12121a", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 18, padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "#00A896", fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.5rem" }}>✓ Consenso confermato</p>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              Grazie. Il tuo volto entrerà nel registro dopo la verifica dei nostri operatori.
              Potrai revocare il consenso in qualsiasi momento.
            </p>
          </div>
        ) : (
          <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "2rem" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Confermi il tuo consenso?</h1>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              Un&apos;organizzazione ti ha registrato nel registro Human2AI come <strong style={{ color: "#f0f0f5" }}>{alias}</strong>.
              Confermi solo tu, di persona, che è davvero il tuo volto e ne autorizzi l&apos;uso.
            </p>

            <div style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1.1rem", marginBottom: "1.5rem" }}>
              <Row label="Nome pubblico" value={alias} />
              {identity && <Row label="Caratteristiche" value={identity} />}
              <Row label="Usi autorizzati" value={categories.length ? categories.join(" · ") : "—"} />
            </div>

            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", marginBottom: "1.2rem", cursor: "pointer" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: "0.2rem" }} />
              <span style={{ color: "#9ca3af", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Confermo di essere la persona raffigurata e autorizzo Human2AI all&apos;uso del mio volto
                secondo gli usi indicati. So che posso revocare il consenso in qualsiasi momento.
              </span>
            </label>

            <label style={{ color: "#6b7280", fontSize: "0.78rem", display: "block", marginBottom: "0.4rem" }}>Firma (il tuo nome)</label>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Nome e cognome"
              style={{ width: "100%", padding: "0.8rem", borderRadius: 10, background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.1)", color: "#f0f0f5", fontSize: "0.95rem", outline: "none", marginBottom: "1.2rem", fontFamily: "inherit" }}
            />

            {error && <p style={{ color: "#B8005C", fontSize: "0.82rem", margin: "0 0 1rem" }}>{error}</p>}

            <button onClick={confirm} disabled={loading}
              style={{ width: "100%", padding: "0.9rem", borderRadius: 10, border: "none", background: loading ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer" }}>
              {loading ? "Conferma…" : "Confermo il mio consenso"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.3rem 0" }}>
      <span style={{ color: "#6b7280", fontSize: "0.82rem" }}>{label}</span>
      <span style={{ color: "#f0f0f5", fontSize: "0.82rem", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
