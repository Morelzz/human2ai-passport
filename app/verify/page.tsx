import { page } from "@/lib/ui";
import { Nav } from "../Nav";
import VerifyClient from "./VerifyClient";

export default function VerifyPage() {
  return (
    <div style={page}>
      <Nav breadcrumb="Verifica token" />

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Verifica un contenuto</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Incolla il <strong style={{ color: "#9ca3af" }}>token di un avatar</strong> o il
            <strong style={{ color: "#9ca3af" }}> certificato di un contenuto generato</strong>: confermiamo
            il consenso e a quale persona reale appartiene.
          </p>
        </div>
        <VerifyClient />
      </main>
    </div>
  );
}
