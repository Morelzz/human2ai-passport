import { redirect } from "next/navigation";
import Link from "next/link";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { PAYOUT_THRESHOLD_CENTS, formatEur } from "@/lib/wallet";
import { demandForAvatar, type DemandSummary } from "@/lib/searches";
import type { ScorableAvatar } from "@/lib/matching";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import LogoutButton from "./LogoutButton";
import PayoutButton from "./PayoutButton";
import SoulActivate from "./SoulActivate";
import OrgAvatars, { OrgAvatar } from "./OrgAvatars";
import LinkWallet from "./LinkWallet";
import { MarkContentsSeen } from "./MarkContentsSeen";
import AnchorPanel from "./AnchorPanel";
import VoltGrantPanel from "./VoltGrantPanel";
import { revenueStatsFor, type RevenueStats } from "@/lib/account-stats";
import { RoyaltyCharts } from "@/components/account/RoyaltyCharts";
import { ContentsGrid, type GridItem } from "@/components/account/ContentsGrid";
import { voltBalance, LOW_BALANCE_THRESHOLD } from "@/lib/volt";
import { ActiveJobs, type ActiveJob } from "@/components/account/ActiveJobs";

const ROLE_LABEL: Record<string, string> = {
  buyer: "Compratore",
  seller: "Creatore",
  admin: "Admin",
  enterprise: "Agenzia",
  // E1 — predisposizione Public Figure: ruolo previsto dal DB, nessun flusso lo assegna ancora.
  manager: "Manager",
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
  let myWallet: string | null = null;
  let soulActive = false;
  let royaltyCents = 0;
  let usageCount = 0;
  let payouts: { id: string; amount_cents: number; status: string; created_at: string }[] = [];
  let demand: DemandSummary | null = null;
  let revenue: RevenueStats | null = null; // serie 30g + categorie (dolore #1: revenue visibili)
  if (role === "seller") {
    const admin = createServerClient();
    const { data: av } = await admin
      .from("avatars")
      .select("id, handle, soul_ref, royalty_accrued_cents, usage_count, owner_wallet, gender, age_range, ethnicity, hair_color, approved_categories, excluded_categories")
      .eq("owner_id", user.id)
      .maybeSingle();
    myAvatar = av?.handle ?? null;
    myWallet = (av as { owner_wallet?: string } | null)?.owner_wallet ?? null;
    soulActive = !!av?.soul_ref;
    royaltyCents = av?.royalty_accrued_cents ?? 0;
    usageCount = av?.usage_count ?? 0;
    // E3 — la domanda reale vista da questo volto (null se la tabella manca)
    if (av) demand = await demandForAvatar(admin, av as unknown as ScorableAvatar);
    if (av?.id) {
      revenue = await revenueStatsFor(av.id, new Date());
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

  // Organizzazioni (Enterprise): tutti gli avatar onboardati dall'agenzia.
  let orgAvatars: OrgAvatar[] = [];
  if (role === "enterprise") {
    const adminOrg = createServerClient();
    const { data: list } = await adminOrg
      .from("avatars")
      .select("handle, alias, verification_status, person_consented_at, consent_token, soul_ref, royalty_accrued_cents, usage_count")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    orgAvatars = (list ?? []) as OrgAvatar[];
  }

  // Contenuti acquistati dall'utente (generazioni commerciali = quelle col certificato).
  // Limite 60: la griglia mostra 6 e fa "Carica altri" sul resto (anti-limbo).
  const admin2 = createServerClient();
  const { data: gens } = await admin2
    .from("generations")
    .select("id, certificate, image_url, royalty_cents, gross_cents, category, tier, created_at, avatars(alias, handle)")
    .eq("buyer_id", user.id)
    .not("certificate", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  type MyGen = {
    id: string; certificate: string | null; image_url: string | null;
    gross_cents: number | null; category: string | null; tier: string | null; created_at: string;
    avatars: { alias: string; handle: string } | { alias: string; handle: string }[] | null;
  };
  const myGenerations: MyGen[] = (gens ?? []) as MyGen[];
  // Adatta al formato della griglia (alias/handle appiattiti).
  const gridItems: GridItem[] = myGenerations.map((g) => {
    const av = Array.isArray(g.avatars) ? g.avatars[0] : g.avatars;
    return {
      id: g.id, certificate: g.certificate, image_url: g.image_url,
      category: g.category, tier: g.tier, created_at: g.created_at,
      alias: av?.alias ?? "—", handle: av?.handle ?? "",
    };
  });

  // Saldo VOLT (null = sistema non configurato: la card si nasconde).
  const volt = await voltBalance(user.id);

  // Job di generazione asincroni IN CORSO (ECHO): stato chiaro su /account invece
  // di una pagina muta (Fase 1.5 / finding 6.5). Solo i propri job, max 10.
  const { data: activeJobsRaw } = await admin2
    .from("generation_jobs")
    .select("id, status, params")
    .eq("buyer_id", user.id)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(10);
  const activeJobs: ActiveJob[] = (activeJobsRaw ?? []).map((j) => ({
    id: j.id as string,
    status: j.status as string,
    category: (j.params as { category?: string | null } | null)?.category ?? null,
  }));

  // VETO (Fase 2.5) — lo scudo visto dal TITOLARE. Se l'utente ha un volto in
  // SOLA PROTEZIONE attiva, gli mostriamo che la protezione è attiva e gli
  // eventuali tentativi di uso del suo volto rilevati su Human2AI (è il titolare
  // che scopre l'abuso, non chi cerca). Query a parte dal blocco creatore: chi
  // protegge il proprio volto di norma è un compratore, non un creatore.
  type ProtectionAlert = { id: string; similarity: number | null; created_at: string };
  let protection: { recent: ProtectionAlert[]; total: number; last30: number } | null = null;
  {
    const { data: prot } = await admin2
      .from("avatars")
      .select("handle, revoked_at")
      .eq("owner_id", user.id)
      .eq("protection_only", true)
      .maybeSingle();
    if (prot?.handle && !prot.revoked_at) {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const { data: alertRows, count } = await admin2
        .from("protection_alerts")
        .select("id, similarity, created_at", { count: "exact" })
        .eq("handle", prot.handle)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (alertRows ?? []) as ProtectionAlert[];
      protection = {
        recent: rows.slice(0, 5),
        total: count ?? rows.length,
        last30: rows.filter((a) => new Date(a.created_at).getTime() >= cutoff).length,
      };
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <MarkContentsSeen />

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

          {/* KYC SOLO per i creatori/venditori. Il compratore accede e basta. */}
          {role === "seller" && (
            <>
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
            </>
          )}
        </div>

        {/* Saldo VOLT: i crediti che alimentano le generazioni. Visibile a tutti
            (nascosto solo se il sistema VOLT non è configurato). */}
        {volt !== null && (
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 0.3rem" }}>I TUOI VOLT</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                <span aria-hidden style={{ fontSize: "1.4rem" }}>⚡</span>
                <span style={{ color: volt <= 0 ? "#B8005C" : volt < LOW_BALANCE_THRESHOLD ? "#f59e0b" : "#f0f0f5", fontSize: "2.2rem", fontWeight: 800, lineHeight: 1 }}>
                  {volt.toLocaleString("it-IT")}
                </span>
              </div>
              {volt < LOW_BALANCE_THRESHOLD && (
                <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "0.4rem 0 0" }}>
                  {volt <= 0 ? "Energia esaurita: ricarica per generare." : "Batteria quasi scarica."}
                </p>
              )}
            </div>
            <Link href="/account/volt" style={{ flexShrink: 0, padding: "0.7rem 1.4rem", borderRadius: 999, background: "#8b47f0", color: "#fff", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
              Ricarica
            </Link>
          </div>
        )}

        {/* Generazioni asincrone in corso: stato live, niente pagina muta (Fase 1.5). */}
        {activeJobs.length > 0 && <ActiveJobs initial={activeJobs} />}

        {/* VETO (Fase 2.5) — lo scudo visto dal titolare: protezione attiva +
            eventuali tentativi di uso del suo volto rilevati su Human2AI. "Veto"
            è il nome interno: in pubblico si parla solo di "volto protetto". */}
        {protection && (
          <div style={{ background: "#0d0d14", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>IL TUO VOLTO È PROTETTO</p>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,168,150,0.1)", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00A896", display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: "#00A896", fontSize: "0.82rem", fontWeight: 700 }}>
                Protezione attiva: dentro Human2AI il tuo volto non può essere generato né concesso.
              </span>
            </div>

            {protection.total > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", margin: "1.1rem 0 0.3rem" }}>
                  <span style={{ color: "#f0f0f5", fontSize: "1.8rem", fontWeight: 800 }}>{protection.total}</span>
                  <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                    {protection.total === 1 ? "volta il tuo volto è stato riconosciuto" : "volte il tuo volto è stato riconosciuto"} in immagini caricate su Human2AI
                    {protection.last30 > 0 && ` (${protection.last30} negli ultimi 30 giorni)`}
                  </span>
                </div>
                <p style={{ color: "#9a9a9a", fontSize: "0.82rem", lineHeight: 1.6, margin: "0.5rem 0 0" }}>
                  Qualcuno ha caricato qui un&apos;immagine in cui compare il tuo volto: può essere un contenuto creato fuori da Human2AI. Conserviamo la traccia per te.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "1rem" }}>
                  {protection.recent.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.45rem" }}>
                      <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                        {new Date(a.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      {a.similarity !== null && (
                        <span style={{ color: "#8b47f0", fontSize: "0.8rem", fontWeight: 700 }}>somiglianza ~{a.similarity}%</span>
                      )}
                    </div>
                  ))}
                </div>
                {protection.total > protection.recent.length && (
                  <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0.6rem 0 0" }}>
                    e altri {protection.total - protection.recent.length} eventi più vecchi.
                  </p>
                )}

                <Link href="/proteggi" style={{ display: "block", textAlign: "center", padding: "0.7rem", borderRadius: 10, background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", color: "#8b47f0", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", marginTop: "1.1rem" }}>
                  Gestisci la tua protezione →
                </Link>
              </>
            ) : (
              <p style={{ color: "#9a9a9a", fontSize: "0.82rem", lineHeight: 1.6, margin: "1rem 0 0" }}>
                Nessun tentativo rilevato finora. Se qualcuno carica su Human2AI un&apos;immagine col tuo volto, lo vedrai qui.
              </p>
            )}

            <p style={{ color: "#374151", fontSize: "0.7rem", margin: "1rem 0 0", lineHeight: 1.5 }}>
              Dentro Human2AI la protezione è garantita lato server. Fuori da qui possiamo avvisarti e aiutarti a chiedere la rimozione, non impedirlo in assoluto. La tutela legale è in revisione.
            </p>
          </div>
        )}

        {role === "admin" && (
          <>
            <Link href="/account/kyc" style={{ display: "block", textAlign: "center", padding: "0.85rem", borderRadius: 12, background: "rgba(0,168,150,0.1)", border: "1px solid rgba(0,168,150,0.3)", color: "#f0f0f5", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginTop: "1.2rem" }}>
              Verifiche identità (KYC) →
            </Link>
            <Link href="/account/review" style={{ display: "block", textAlign: "center", padding: "0.85rem", borderRadius: 12, background: "rgba(184,0,92,0.1)", border: "1px solid rgba(184,0,92,0.3)", color: "#f0f0f5", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginTop: "0.8rem" }}>
              Coda di revisione operatori →
            </Link>
            <Link href="/account/reports" style={{ display: "block", textAlign: "center", padding: "0.85rem", borderRadius: 12, background: "rgba(184,0,92,0.1)", border: "1px solid rgba(184,0,92,0.3)", color: "#f0f0f5", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginTop: "0.8rem" }}>
              Segnalazioni di abuso →
            </Link>
            <Link href="/account/face-index" style={{ display: "block", textAlign: "center", padding: "0.85rem", borderRadius: 12, background: "rgba(139,71,240,0.1)", border: "1px solid rgba(139,71,240,0.3)", color: "#f0f0f5", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginTop: "0.8rem" }}>
              Indice volti del registro →
            </Link>
            <AnchorPanel />
            <VoltGrantPanel />
          </>
        )}

        {role === "enterprise" && (
          <>
            <OrgAvatars avatars={orgAvatars} />
            <Link href="/account/attivita" style={{ display: "block", textAlign: "center", padding: "0.85rem", borderRadius: 12, background: "rgba(0,168,150,0.1)", border: "1px solid rgba(0,168,150,0.3)", color: "#00d4be", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", marginTop: "1.2rem" }}>
              Attività dei tuoi volti →
            </Link>
          </>
        )}

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
                <LinkWallet initialWallet={myWallet} />
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

            {/* Revenue-hero: il guadagno in grande (dolore #1 risolto), col passo
                degli ultimi 30 giorni e gli utilizzi totali. */}
            <div style={{ marginBottom: "1.1rem" }}>
              <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Royalty accumulate</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.7rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                <span style={{ color: "#00A896", fontSize: "2.6rem", fontWeight: 800, lineHeight: 1 }}>{formatEur(royaltyCents)}</span>
                {revenue && revenue.last30Cents > 0 && (
                  <span style={{ color: "#8b47f0", fontSize: "0.85rem", fontWeight: 700 }}>
                    +{formatEur(revenue.last30Cents)} <span style={{ color: "#6b7280", fontWeight: 500 }}>ultimi 30 giorni</span>
                    {revenue.deltaPct !== null && (
                      <span style={{ color: revenue.deltaPct >= 0 ? "#00A896" : "#B8005C", marginLeft: "0.4rem" }}>
                        {revenue.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(revenue.deltaPct)}%
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p style={{ color: "#374151", fontSize: "0.78rem", margin: "0.5rem 0 0" }}>{usageCount} utilizzi totali</p>
            </div>

            {/* Grafici royalty (30 giorni + per categoria) */}
            {revenue && (
              <div style={{ marginBottom: "1.2rem" }}>
                <RoyaltyCharts stats={revenue} />
              </div>
            )}

            <Link href="/account/attivita" style={{ display: "block", textAlign: "center", padding: "0.6rem", borderRadius: 10, background: "rgba(0,168,150,0.1)", border: "1px solid rgba(0,168,150,0.3)", color: "#00d4be", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", marginBottom: "1.2rem" }}>
              Attività del mio volto →
            </Link>

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

        {/* E3 — "Il tuo volto è stato cercato": la domanda reale degli ultimi
            7 giorni vista da questo volto. Compare solo se c'è almeno una
            ricerca compatibile (e se la tabella match_searches esiste). */}
        {role === "seller" && myAvatar && demand && demand.compatible > 0 && (
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>IL TUO VOLTO È STATO CERCATO</p>

            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.3rem" }}>
              <span style={{ color: "#f0f0f5", fontSize: "1.8rem", fontWeight: 800 }}>{demand.compatible}</span>
              <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                {demand.compatible === 1 ? "ricerca compatibile" : "ricerche compatibili"} col tuo volto negli ultimi {demand.days} giorni
              </span>
            </div>

            {demand.notGranted > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(107,33,232,0.1)", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 10, padding: "0.7rem 0.9rem", margin: "0.9rem 0 0" }}>
                  <span style={{ color: "#8b47f0", fontSize: "0.82rem", fontWeight: 700 }}>
                    {demand.notGranted === 1 ? "1 era in una categoria che oggi non concedi" : `${demand.notGranted} erano in categorie che oggi non concedi`}
                  </span>
                </div>
                <Link href="/account/consent" style={{ display: "block", textAlign: "center", padding: "0.6rem", borderRadius: 10, background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", color: "#8b47f0", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", marginTop: "0.8rem" }}>
                  Apri nuove categorie — decidi tu →
                </Link>
              </>
            )}

            <p style={{ color: "#374151", fontSize: "0.7rem", margin: "1rem 0 0", lineHeight: 1.5 }}>
              Registriamo solo la forma della domanda: chi cerca resta anonimo.
            </p>
          </div>
        )}

        {myGenerations.length > 0 && (
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>I MIEI CONTENUTI</p>
            <ContentsGrid items={gridItems} shareVariant="buyer" />
            <p style={{ color: "#374151", fontSize: "0.7rem", margin: "1rem 0 0", lineHeight: 1.5 }}>
              Ogni contenuto è certificato e la persona reale è stata remunerata.
            </p>
          </div>
        )}

        {/* Reclutamento: il buyer è anche una persona reale. L'account stesso
            invita a mettere il proprio volto nel registro (e a guadagnarci).
            Non si mostra a chi ha PROTETTO il volto: proteggere e concedere lo
            stesso volto si escludono (guardia 1:1 server-side, modulo VETO). */}
        {role === "buyer" && !protection && (
          <div style={{ background: "linear-gradient(135deg, rgba(107,33,232,0.12), rgba(184,0,92,0.08))", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
            <p style={{ color: "#f0f0f5", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.4rem" }}>Metti il tuo volto nel registro</p>
            <p style={{ color: "#9a9a9a", fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
              Sei una persona reale: il tuo volto può entrare nel registro, restare sotto il tuo
              consenso e farti guadagnare ogni volta che viene usato. Tu decidi tutto, sempre.
            </p>
            <Link href="/scansione" style={{ display: "inline-block", padding: "0.7rem 1.4rem", borderRadius: 999, background: "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
              Scopri come entrare →
            </Link>
          </div>
        )}

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
          <LogoutButton />
        </div>

        <p style={{ color: "#374151", fontSize: "0.78rem", lineHeight: 1.6, marginTop: "1.5rem", textAlign: "center" }}>
          Il tuo profilo è protetto: solo tu puoi vederlo e modificarlo.
        </p>
      </section>
      </div>
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
