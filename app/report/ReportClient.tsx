"use client";

import { useState } from "react";
import Link from "next/link";

const REASONS: { value: string; label: string }[] = [
  { value: "no_consent", label: "La persona non ha dato il consenso" },
  { value: "impersonation", label: "Impersonazione / identità falsa" },
  { value: "misuse", label: "Uso fuori dalle categorie concesse" },
  { value: "illegal", label: "Contenuto illegale o dannoso" },
  { value: "other", label: "Altro" },
];

interface Props {
  initialHandle: string;
  initialCert: string;
}

export default function ReportClient({ initialHandle, initialCert }: Props) {
  const [handle, setHandle] = useState(initialHandle);
  const [certificate, setCertificate] = useState(initialCert);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = !!reason && (!!handle.trim() || !!certificate.trim());

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim() || undefined,
          certificate: certificate.trim() || undefined,
          reason,
          details: details.trim() || undefined,
          reporter_email: email.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) { setError(json.error ?? "Errore nell'invio"); return; }
      setDone(true);
    } catch {
      setBusy(false);
      setError("Errore di rete");
    }
  }

  if (done) {
    return (
      <div style={{ background: "#12121a", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,168,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <p style={{ color: "#00A896", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 0.4rem" }}>Segnalazione ricevuta</p>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
          Grazie. Gli operatori la revisioneranno. Se hai lasciato un&apos;email, ti aggiorneremo sull&apos;esito.
        </p>
        <Link href="/" style={{ color: "#6B21E8", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 8, padding: "0.5rem 1rem" }}>
          Torna alla home
        </Link>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    color: "#f0f0f5",
    fontSize: "0.9rem",
    padding: "0.7rem",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#6b7280",
    fontSize: "0.75rem",
    letterSpacing: "0.08em",
    margin: "0 0 0.5rem",
  };

  return (
    <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <label htmlFor="rp-handle" style={labelStyle}>AVATAR (HANDLE)</label>
        <input id="rp-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@random" style={inputStyle} />
      </div>

      <div>
        <label htmlFor="rp-cert" style={labelStyle}>CERTIFICATO CONTENUTO (OPZIONALE)</label>
        <input id="rp-cert" value={certificate} onChange={(e) => setCertificate(e.target.value)} placeholder="SHA-256 del contenuto generato…" style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.82rem" }} />
        <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0.4rem 0 0" }}>Indica l&apos;handle dell&apos;avatar oppure il certificato di un contenuto.</p>
      </div>

      <div>
        <label style={labelStyle}>MOTIVO</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {REASONS.map((r) => (
            <label key={r.value} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", color: reason === r.value ? "#f0f0f5" : "#9ca3af", fontSize: "0.88rem" }}>
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} style={{ accentColor: "#6B21E8" }} />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="rp-details" style={labelStyle}>DETTAGLI (OPZIONALE)</label>
        <textarea id="rp-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Descrivi cosa è successo…" style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div>
        <label htmlFor="rp-email" style={labelStyle}>LA TUA EMAIL (OPZIONALE, PER RICONTATTO)</label>
        <input id="rp-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tu@esempio.com" style={inputStyle} />
      </div>

      {error && <p style={{ color: "#B8005C", fontSize: "0.85rem", margin: 0 }}>{error}</p>}

      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        style={{
          width: "100%",
          padding: "0.8rem",
          borderRadius: 10,
          border: "none",
          background: canSubmit && !busy ? "linear-gradient(135deg,#6B21E8,#B8005C)" : "#1c1c28",
          color: canSubmit && !busy ? "#fff" : "#4b5563",
          fontWeight: 700,
          fontSize: "0.9rem",
          cursor: canSubmit && !busy ? "pointer" : "not-allowed",
        }}
      >
        {busy ? "Invio in corso…" : "Invia segnalazione"}
      </button>

      <p style={{ color: "#374151", fontSize: "0.72rem", lineHeight: 1.5, margin: 0 }}>
        Le segnalazioni infondate o ripetute possono essere ignorate. Non inserire dati sensibili nei dettagli.
      </p>
    </div>
  );
}
