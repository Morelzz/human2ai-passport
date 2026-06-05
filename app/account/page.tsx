import { redirect } from "next/navigation";
import Link from "next/link";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { PAYOUT_THRESHOLD_CENTS, formatEur } from "@/lib/wallet";
import LogoutButton from "./LogoutButton";
import PayoutButton from "./PayoutButton";
import SoulActivate from "./SoulActivate";

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

  // Avatar del creatore (se esiste)
  let myAvatar: string | null = null;
  let soulActive = false;
  let royaltyCents = 0;
  let usageCount = 0;
  let payouts: { id: string; amount_cents: number; status: string; created_at: string }[] = [];
  if (role === "seller") {
    const admin = createServerClient();
    const { data: av } = await admin
      .from("avatars")
      .select("id, handle, soul_ref, royalty_accrued_cents, usage_count")
      .eq("owner_id", user.id)
      .maybeSingle();
    myAvatar = av?.handle ?? null;
    soulActive = !!av?.soul_ref;
    royaltyCents = av?.royalty_accrued_cents ?? 0;
    usageCount = av?.usage_count ?? 0;
    if (av?.id) {
      const { data: ledger } = await admin
        .from("payouts")
        .select("id, amount_cents, status, created_at")
        .eq("avatar_id", av.id)
        .order("created_at", { ascending: false })
        .limit(10);
      payouts = ledger ?? [];
    }
  }
  const isVerifiedSeller = role === "seller" && profile?.kyc_status === "approved";

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
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", margin: "0 0 0.4rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>
            Ciao, {profile?.full_name || "utente"}
          </h1>
          {profile?.kyc_status === "approved" && <VerifiedBadge />}
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 2rem" }}>{user.email}</p>

        <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <Row label="Tipo di account" value={ROLE_LABEL[role] ?? role} />
          <Row label="Verifica identità (KYC)" value={kyc.text} valueColor={kyc.color} />

          {(profile?.kyc_status ?? "none") !== "approved" && (
            <Link
              href="/account/verify"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.75rem",
                borderRadius: 10,
                background: "linear-gradient(135deg,#6B21E8,#B8005C)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              {profile?.kyc_status === "rejected" ? "Riprova la verifica" : "Verifica ora la tua identità"}
            </Link>
          )}
        </div>

        {role === "seller" && (
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>IL TUO AVATAR</p>
            {myAvatar ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {/* Stato del Soul */}
                {soulActive ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,168,150,0.1)", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00A896", display: "inline-block" }} />
                    <span style={{ color: "#00A896", fontSize: "0.82rem", fontWeight: 700 }}>Soul attivo — il tuo avatar è generabile</span>
                  </div>
                ) : (
                  <div style={{ background: "#0a0a0f", border: "1px solid rgba(107,33,232,0.25)", borderRadius: 12, padding: "1.1rem" }}>
                    <p style={{ color: "#8b47f0", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 0.8rem" }}>ATTIVA IL TUO SOUL</p>
                    <SoulActivate />
                  </div>
                )}
                <Link href={`/passport/${myAvatar}`} style={{ display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 10, background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", color: "#f0f0f5", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                  Vai al tuo passport pubblico →
                </Link>
                <Link href="/account/consent" style={{ display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                  Gestisci il consenso
                </Link>
              </div>
            ) : isVerifiedSeller ? (
              <Link href="/account/avatar" style={{ display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 10, background: "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                Crea il tuo avatar nel registro
              </Link>
            ) : (
              <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: 0, lineHeight: 1.6 }}>
                Verifica prima la tua identità per poter creare il tuo avatar.
              </p>
            )}
          </div>
        )}

        {role === "seller" && myAvatar && (
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>IL TUO WALLET</p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
              <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Royalty accumulate</span>
              <span style={{ color: "#00A896", fontSize: "1.5rem", fontWeight: 800 }}>{formatEur(royaltyCents)}</span>
            </div>
            <p style={{ color: "#374151", fontSize: "0.78rem", margin: "0 0 1.2rem" }}>{usageCount} utilizzi totali</p>

            {/* Barra verso la soglia di payout */}
            <div style={{ height: 8, background: "#12121a", borderRadius: 999, overflow: "hidden", marginBottom: "0.5rem" }}>
              <div style={{ height: "100%", width: `${Math.min(100, (royaltyCents / PAYOUT_THRESHOLD_CENTS) * 100)}%`, background: "linear-gradient(90deg,#6B21E8,#00A896)" }} />
            </div>
            <p style={{ color: "#6b7280", fontSize: "0.76rem", margin: "0 0 1.2rem" }}>
              Soglia payout: {formatEur(PAYOUT_THRESHOLD_CENTS)}
            </p>

            <PayoutButton eligible={royaltyCents >= PAYOUT_THRESHOLD_CENTS} amount={formatEur(royaltyCents)} />

            {/* Storico payout (ledger tracciabile) */}
            {payouts.length > 0 && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.2rem" }}>
                <p style={{ color: "#6b7280", fontSize: "0.76rem", letterSpacing: "0.06em", margin: "0 0 0.8rem" }}>STORICO PAYOUT</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {payouts.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                        {new Date(p.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#00A896", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>{p.status}</span>
                        <span style={{ color: "#f0f0f5", fontSize: "0.88rem", fontWeight: 700 }}>{formatEur(p.amount_cents)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ color: "#374151", fontSize: "0.78rem", lineHeight: 1.6, marginTop: "2rem" }}>
          Il tuo profilo è protetto: solo tu puoi vederlo e modificarlo.
        </p>
      </section>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(0,168,150,0.12)", border: "1px solid rgba(0,168,150,0.35)", borderRadius: 999, padding: "0.25rem 0.7rem" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="3">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span style={{ color: "#00A896", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em" }}>
        Creatore verificato
      </span>
    </span>
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
