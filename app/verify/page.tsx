import Link from "next/link";
import VerifyClient from "./VerifyClient";

export default function VerifyPage() {
  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)", flexShrink: 0 }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.85rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <span style={{ color: "#374151" }}>/</span>
        <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Verifica token</span>
      </nav>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Verifica un contenuto</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Incolla il token di verifica di un avatar Human2AI per confermare che il consenso è valido e tracciare a quale persona reale appartiene.
          </p>
        </div>
        <VerifyClient />
      </main>
    </div>
  );
}
