"use client";

// Componenti UI condivisi tra /login e /signup.
import Link from "next/link";

export const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#6b7280",
  fontSize: "0.75rem",
  marginBottom: "0.35rem",
  letterSpacing: "0.04em",
};

export function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{
          width: "100%",
          padding: "0.7rem 0.9rem",
          borderRadius: 10,
          background: "#12121a",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#f0f0f5",
          fontSize: "0.9rem",
          outline: "none",
        }}
      />
    </div>
  );
}

export function submitStyle(loading: boolean): React.CSSProperties {
  return {
    padding: "0.8rem",
    borderRadius: 10,
    border: "none",
    background: loading ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: loading ? "default" : "pointer",
    marginTop: "0.3rem",
  };
}

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none", marginBottom: "2rem" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
        <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
      </Link>
      <div style={{ width: "100%", maxWidth: 380, background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "2rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 1.5rem" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
