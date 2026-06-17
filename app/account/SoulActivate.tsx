"use client";

import { useState } from "react";

const MIN = 8;
const MAX = 20;

export default function SoulActivate() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const count = files.length;

  async function activate() {
    if (count < MIN) { setError(`Carica almeno ${MIN} foto`); return; }
    setLoading(true); setError(null);
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    try {
      const res = await fetch("/api/avatar/soul", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Errore"); setLoading(false); return; }
      setDone(true);
      setTimeout(() => location.reload(), 1500);
    } catch {
      setError("Errore di rete durante l'upload");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p style={{ color: "#00A896", fontSize: "0.88rem", fontWeight: 700, margin: 0 }}>
        ✓ Soul attivato! Il tuo avatar ora è generabile.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <p style={{ color: "#6b7280", fontSize: "0.84rem", lineHeight: 1.6, margin: 0 }}>
        Carica <strong style={{ color: "#9ca3af" }}>{MIN}-{MAX} foto nitide</strong> del tuo volto
        (angolazioni e luci diverse). Creeremo il tuo <strong style={{ color: "#9ca3af" }}>Soul</strong>:
        il modello che garantisce la tua identità in ogni generazione.
      </p>

      <label style={{ display: "block", textAlign: "center", padding: "0.85rem", borderRadius: 10, background: "rgba(242,169,59,0.1)", border: "1px dashed rgba(242,169,59,0.4)", color: "#F2A93B", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
        {count > 0 ? `${count} foto selezionate` : "Scegli le foto"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          style={{ display: "none" }}
        />
      </label>

      <button
        onClick={activate}
        disabled={loading || count < MIN}
        style={{ padding: "0.85rem", borderRadius: 10, border: "none", background: loading || count < MIN ? "#374151" : "linear-gradient(135deg,#F2A93B,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: loading || count < MIN ? "default" : "pointer" }}
      >
        {loading ? "Creazione del Soul… (può richiedere qualche minuto)" : "Attiva il mio Soul"}
      </button>

      {error && <p style={{ color: "#B8005C", fontSize: "0.82rem", margin: 0 }}>{error}</p>}
      <p style={{ color: "#374151", fontSize: "0.72rem", margin: 0, lineHeight: 1.5 }}>
        La creazione del Soul è a carico nostro. Operazione una tantum.
      </p>
    </div>
  );
}
