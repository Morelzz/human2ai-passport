"use client";

// Componenti UI condivisi tra /login e /signup.
import { useId } from "react";
import { Logo } from "@/app/Nav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--text-muted)",
  fontSize: "0.75rem",
  marginBottom: "0.35rem",
  letterSpacing: "0.04em",
};

export function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  // useId: label e input associati per l'accessibilita' (screen reader).
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{
          width: "100%",
          padding: "0.7rem 0.9rem",
          borderRadius: 10,
          background: "var(--surface)",
          border: "1px solid var(--hairline-soft)",
          color: "var(--text)",
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
    background: loading ? "var(--elevated)" : "#F2A93B",
    color: "#412402",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: loading ? "default" : "pointer",
    marginTop: "0.3rem",
  };
}

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-obsidian p-6 text-foreground">
      <CineBackground />
      <div className="relative z-[2] mb-8">
        <Logo size={26} />
      </div>
      <div className="glass relative z-[2] w-full max-w-sm rounded-2xl p-8">
        <h1 className="mb-6 text-xl font-extrabold">{title}</h1>
        {children}
      </div>
    </div>
  );
}
