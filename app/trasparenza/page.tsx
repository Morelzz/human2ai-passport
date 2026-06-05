import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { formatEur } from "@/lib/wallet";

export const metadata = {
  title: "Trasparenza — Human2AI",
  description: "I numeri reali del registro: persone consenzienti, generazioni certificate, royalty pagate.",
};

// Pagina pubblica: prova vivente del modello. Solo aggregati, nessun dato personale.
export default async function TrasparenzaPage() {
  const sb = createServerClient();

  const { count: avatarsTotal } = await sb.from("avatars").select("id", { count: "exact", head: true });
  const { count: avatarsActive } = await sb.from("avatars").select("id", { count: "exact", head: true }).is("revoked_at", null);

  // Generazioni certificate (commerciali) + royalty maturate per le persone.
  const { data: gens } = await sb.from("generations").select("royalty_cents").not("certificate", "is", null);
  const genCount = gens?.length ?? 0;
  const royaltyAccrued = (gens ?? []).reduce((s, g) => s + (g.royalty_cents ?? 0), 0);

  // Payout già erogati.
  const { data: pays } = await sb.from("payouts").select("amount_cents");
  const payoutCount = pays?.length ?? 0;
  const payoutPaid = (pays ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  const stats = [
    { label: "Persone reali nel registro", value: String(avatarsTotal ?? 0), c: "#6B21E8" },
    { label: "Consensi attivi", value: String(avatarsActive ?? 0), c: "#00A896" },
    { label: "Generazioni certificate", value: String(genCount), c: "#B8005C" },
    { label: "Maturato per le persone reali", value: formatEur(royaltyAccrued), c: "#00A896" },
    { label: "Già erogato (payout)", value: formatEur(payoutPaid), c: "#6B21E8" },
    { label: "Payout effettuati", value: String(payoutCount), c: "#9ca3af" },
  ];

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/match" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Trova un volto</Link>
          <Link href="/pricing" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Prezzi</Link>
        </div>
      </nav>

      <section style={{ maxWidth: 880, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ color: "#00A896", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em" }}>TRASPARENZA</span>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, margin: "0.5rem 0 1rem" }}>
            La prova è nei numeri
          </h1>
          <p style={{ color: "#6b7280", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Ogni volto è una persona reale che ha acconsentito. Ogni generazione è tracciata e
            paga chi c&apos;è dietro. Niente di nascosto: questi sono i numeri del registro.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.6rem" }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: s.c, lineHeight: 1.1 }}>{s.value}</div>
              <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        <p style={{ color: "#374151", fontSize: "0.8rem", textAlign: "center", margin: "2.5rem 0 0", lineHeight: 1.6 }}>
          Nessun dato personale o biometrico è esposto. Solo aggregati. Ogni contenuto è
          verificabile dal suo certificato in <Link href="/verify" style={{ color: "#00A896", textDecoration: "none" }}>/verify</Link>.
        </p>
      </section>
    </div>
  );
}
