// app/match/AgeGateModal.tsx
"use client";

import { useState } from "react";

// Prompt una-tantum: appare quando /api/generate risponde 403 code "age_unverified".
// Posta a /api/account/confirm-age; in caso di successo chiama onConfirmed().
export function AgeGateModal({ onClose, onConfirmed }: { onClose: () => void; onConfirmed: () => void }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!day || !month || !year) { setError("Inserisci la tua data di nascita"); return; }
    setLoading(true);
    setError(null);
    const date_of_birth = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const res = await fetch("/api/account/confirm-age", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_of_birth }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    onConfirmed();
  }

  const sel: React.CSSProperties = { padding: "0.7rem 0.5rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "var(--text)", fontSize: "0.85rem" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,10,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div className="glass" style={{ width: "100%", maxWidth: 380, borderRadius: 18, padding: "1.4rem 1.2rem" }}>
        <p style={{ color: "#F2A93B", fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Una verifica veloce</p>
        <h3 style={{ fontWeight: 300, letterSpacing: "-0.02em", fontSize: "1.3rem", margin: "0 0 0.5rem" }}>Prima di continuare</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
          Per legge dobbiamo sapere che hai almeno 18 anni. Inserisci la tua data di nascita: la chiediamo una volta sola.
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <select value={day} onChange={(e) => setDay(e.target.value)} style={{ ...sel, flex: "0 0 64px" }}>
            <option value="">GG</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={String(d)}>{d}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...sel, flex: 1 }}>
            <option value="">Mese</option>
            {["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"].map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={{ ...sel, flex: "0 0 90px" }}>
            <option value="">AAAA</option>
            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        {error && <p style={{ color: "var(--blocked-c)", fontSize: "0.78rem", margin: "0.7rem 0 0" }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{ marginTop: "1rem", width: "100%", background: "#F2A93B", color: "#412402", border: "none", borderRadius: 999, padding: "0.8rem", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer" }}>
          {loading ? "Verifica…" : "Conferma e continua"}
        </button>
        <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", margin: "0.7rem 0 0", lineHeight: 1.5 }}>
          Serve solo a verificare l'età. Resta privata, non viene mostrata nel tuo profilo.
        </p>
        <button onClick={onClose} style={{ marginTop: "0.6rem", width: "100%", background: "transparent", color: "var(--text-muted)", border: "none", fontSize: "0.78rem", cursor: "pointer" }}>
          Annulla
        </button>
      </div>
    </div>
  );
}
