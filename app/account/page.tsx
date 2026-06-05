import { redirect } from "next/navigation";
import Link from "next/link";
import { createAuthClient } from "@/lib/supabase-auth";
import LogoutButton from "./LogoutButton";

const ROLE_LABEL: Record<string, string> = {
  buyer: "Compratore",
  seller: "Creatore",
  admin: "Admin",
};

const KYC_LABEL: Record<string, { text: string; color: string }> = {
  none: { text: "Non avviata", color: "#6b7280" },
  pending: { text: "In verifica", color: "#00A896" },
  approved: { text: "Verificato", color: "#00A896" },
  rejected: { text: "Rifiutata", color: "#B8005C" },
};

export default async function AccountPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, kyc_status")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "buyer";
  const kyc = KYC_LABEL[profile?.kyc_status ?? "none"];

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <LogoutButton />
      </nav>

      <section style={{ maxWidth: 560, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
          Ciao, {profile?.full_name || "utente"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 2rem" }}>{user.email}</p>

        <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <Row label="Tipo di account" value={ROLE_LABEL[role] ?? role} />
          <Row label="Verifica identità (KYC)" value={kyc.text} valueColor={kyc.color} />
        </div>

        <p style={{ color: "#374151", fontSize: "0.78rem", lineHeight: 1.6, marginTop: "2rem" }}>
          Il tuo profilo è protetto: solo tu puoi vederlo e modificarlo.
          La verifica identità arriverà nel prossimo modulo.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, valueColor = "#f0f0f5" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>{label}</span>
      <span style={{ color: valueColor, fontSize: "0.9rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
