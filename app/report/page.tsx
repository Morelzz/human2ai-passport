import { page } from "@/lib/ui";
import { Nav } from "../Nav";
import ReportClient from "./ReportClient";

interface Props {
  searchParams: Promise<{ handle?: string; cert?: string }>;
}

// Segnalazione pubblica di abuso — accessibile a chiunque, anche senza account.
export default async function ReportPage({ searchParams }: Props) {
  const { handle, cert } = await searchParams;

  return (
    <div style={page}>
      <Nav breadcrumb="Segnala abuso" />

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
