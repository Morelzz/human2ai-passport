import Link from "next/link";
import ReportClient from "./ReportClient";

interface Props {
  searchParams: Promise<{ handle?: string; cert?: string }>;
}

// Segnalazione pubblica di abuso — accessibile a chiunque, anche senza account.
export default async function ReportPage({ searchParams }: Props) {
  const { handle, cert } = await searchParams;

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)", flexShrink: 0 }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.85rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <span style={{ color: "#374151" }}>/</span>
        <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Segnala abuso</span>
      </nav>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <span style={{ color: "#B8005C", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>ENFORCEMENT</span>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Segnala un abuso</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
            Se un avatar non rappresenta una persona realmente consenziente, è un&apos;<strong style={{ color: "#9ca3af" }}>impersonazione</strong>,
            o un contenuto è stato usato fuori dalle categorie concesse, segnalalo. Gli operatori revisionano
            ogni segnalazione e, se accolta, l&apos;avatar viene rimosso dal registro pubblico.
          </p>
        </div>
        <ReportClient initialHandle={handle ?? ""} initialCert={cert ?? ""} />
      </main>
    </div>
  );
}
