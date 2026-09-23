import { redirect } from "next/navigation";
import Link from "next/link";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { PAYOUT_THRESHOLD_CENTS, formatEur, splitEcho } from "@/lib/wallet";
import { demandForAvatar, type DemandSummary } from "@/lib/searches";
import type { ScorableAvatar } from "@/lib/matching";
import { SiteNav } from "@/components/marketing/SiteNav";
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
import { VideoStrip, type VideoItem } from "@/components/account/VideoStrip";
import { voltBalance, LOW_BALANCE_THRESHOLD } from "@/lib/volt";
import { ActiveJobs, type ActiveJob } from "@/components/account/ActiveJobs";
import { Linguette, VaiAllaScheda, type Scheda } from "@/components/account/Linguette";
import { Invita } from "@/components/account/Invita";
import { WardVolto } from "@/components/account/WardVolto";
import { monitoringConsentStatus } from "@/lib/ward/consent";
import { Quadro, type Numero } from "@/components/account/Quadro";
import { eOperatore } from "@/lib/operatori";
import { scegliVoltoDaSorvegliare } from "@/lib/ward/quale-volto";

const ROLE_LABEL: Record<string, string> = {
  buyer: "Compratore",
  seller: "Creatore",
  admin: "Admin",
  enterprise: "Agenzia",
  // E1 — predisposizione Public Figure: ruolo previsto dal DB, nessun flusso lo assegna ancora.
  manager: "Manager",
};

const KYC_LABEL: Record<string, { text: string; color: string }> = {
  none: { text: "Non avviata", color: "var(--text-muted)" },
  pending: { text: "In verifica", color: "var(--verified-c)" },
  approved: { text: "Verificato", color: "var(--verified-c)" },
  rejected: { text: "Rifiutata", color: "var(--blocked-c)" },
};

export default async function AccountPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=%2Faccount");

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
    // ATTENZIONE: maybeSingle() con DUE volti dello stesso proprietario torna
    // errore e data null, e il creatore non vedeva piu' un euro dei suoi
    // guadagni (trovato il 22/9 sull'account demo, che ne ha due). Si prende
    // quello che conta: prima chi non si e' ritirato, poi il piu' usato.
    const { data: avs } = await admin
      .from("avatars")
      .select("id, handle, soul_ref, royalty_accrued_cents, usage_count, owner_wallet, gender, age_range, ethnicity, hair_color, commercial_consent, revoked_at")
      .eq("owner_id", user.id)
      .order("usage_count", { ascending: false, nullsFirst: false })
      .limit(10);
    const av = (avs ?? []).find((x) => !x.revoked_at) ?? (avs ?? [])[0] ?? null;
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

  // Organizzazioni (Enterprise): stato KYB dell'azienda + avatar onboardati.
  let orgAvatars: OrgAvatar[] = [];
  let orgKyb: { name: string; kyb_status: string } | null = null;
  if (role === "enterprise") {
    const adminOrg = createServerClient();
    const { data: org } = await adminOrg
      .from("organizations")
      .select("name, kyb_status")
      .eq("owner_id", user.id)
      .maybeSingle();
    orgKyb = (org as { name: string; kyb_status: string } | null) ?? null;
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
    .select("id, certificate, image_url, royalty_cents, gross_cents, category, tier, created_at, avatars!generations_avatar_id_fkey(alias, handle)")
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
      alias: av?.alias ?? "Avatar", handle: av?.handle ?? "",
    };
  });

  // Video Anima del buyer (tabella di anima_video.sql: se manca, nessun video).
  // select("*"): le colonne del controllo possono arrivare dopo.
  let myVideos: VideoItem[] = [];
  {
    const { data: vids, error: vidErr } = await admin2
      .from("animations")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);
    if (!vidErr && vids?.length) {
      const cert = new Map(myGenerations.map((g) => [g.id, g.certificate]));
      myVideos = (vids as Record<string, unknown>[]).map((v) => {
        const c = cert.get(String(v.source_generation_id));
        return {
          id: String(v.id),
          status: v.status as VideoItem["status"],
          video_url: (v.video_url as string | null) ?? null,
          poster: c ? `/api/content/${c}` : null,
          certificate: (v.certificate as string | null) ?? null,
          seconds: Number(v.seconds ?? 5),
          somiglianza: typeof v.identity_score === "number" ? v.identity_score : null,
          fotogrammi: typeof v.frames_checked === "number" ? v.frames_checked : null,
          errore: (v.error as string | null) ?? null,
          created_at: String(v.created_at),
        };
      });
    }
  }

  // Operatore: ruolo admin oppure email nella lista SEMBLIC_OPERATORI (lib/operatori).
  const operatore = eOperatore(role, user.email);
  // Operatori: quanti messaggi del modulo contatti aspettano risposta.
  let messaggiAperti = 0;
  if (operatore) {
    const { count } = await admin2.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "open");
    messaggiAperti = count ?? 0;
  }

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
  // eventuali tentativi di uso del suo volto rilevati su Semblic (è il titolare
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
      const cutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // Solo i 5 piu' recenti per la lista; il totale e gli ultimi 30 giorni sono
      // conteggi ESATTI lato DB (niente sottostima oltre i 5 mostrati, anche con
      // molti alert su uno stesso volto).
      const { data: alertRows, count } = await admin2
        .from("protection_alerts")
        .select("id, similarity, created_at", { count: "exact" })
        .eq("handle", prot.handle)
        .order("created_at", { ascending: false })
        .limit(5);
      const { count: last30 } = await admin2
        .from("protection_alerts")
        .select("id", { count: "exact", head: true })
        .eq("handle", prot.handle)
        .gte("created_at", cutoffIso);
      const rows = (alertRows ?? []) as ProtectionAlert[];
      protection = {
        recent: rows,
        total: count ?? rows.length,
        last30: last30 ?? 0,
      };
    }
  }

  // ── Ward sul proprio volto ─────────────────────────────────────────────
  // Chi ha detto si' al registro e' la persona piu' esposta: da oggi puo'
  // accendere il cane da guardia anche lui, non solo chi sta in sola protezione.
  let wardAvatarId: string | null = null;
  let wardAcceso = false;
  let wardTrovate = 0;
  {
    const { data: miei } = await admin2
      .from("avatars")
      .select("id, protection_only, revoked_at")
      .eq("owner_id", user.id)
      .order("protection_only", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(10);
    const scelto = scegliVoltoDaSorvegliare(miei ?? []);
    if (scelto) {
      wardAvatarId = scelto.id as string;
      const { data: cons } = await admin2
        .from("monitoring_consents")
        .select("scope, on_match, open_web, granted_at, expires_at, revoked_at")
        .eq("avatar_id", wardAvatarId)
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      wardAcceso = monitoringConsentStatus(cons ?? null, new Date().toISOString()) === "active";
      if (wardAcceso) {
        const { count } = await admin2.from("scan_matches").select("id", { count: "exact", head: true }).eq("avatar_id", wardAvatarId);
        wardTrovate = count ?? 0;
      }
    }
  }

  // ── Operatore: quante cose aspettano una risposta ──────────────────────
  let daKyc = 0;
  let daVolti = 0;
  let daSegnalazioni = 0;
  if (operatore) {
    const [k, v, s] = await Promise.all([
      admin2.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
      admin2.from("avatars").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      admin2.from("abuse_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    daKyc = k.count ?? 0;
    daVolti = v.count ?? 0;
    daSegnalazioni = s.count ?? 0;
  }
  const daOperatore = daKyc + daVolti + daSegnalazioni + messaggiAperti;

  // ── I QUATTRO NUMERI IN TESTA ──────────────────────────────────────────
  const numeri: Numero[] = [];
  if (volt !== null) {
    numeri.push({
      v: `⚡ ${volt.toLocaleString("it-IT")}`,
      e: volt <= 0 ? "VOLT · energia esaurita" : volt < LOW_BALANCE_THRESHOLD ? "VOLT · batteria quasi scarica" : "VOLT · i crediti per generare",
      acceso: true,
    });
  }
  if (role === "seller" && myAvatar) {
    numeri.push({ v: formatEur(royaltyCents).replace("€", "").trim(), unita: "EUR", e: "Guadagnato col tuo volto" });
  }
  if (myGenerations.length > 0) {
    numeri.push({
      v: String(myGenerations.length),
      e: myVideos.length > 0 ? `Contenuti tuoi · ${myVideos.length} video` : "Contenuti tuoi",
    });
  }
  if (role === "seller" && myAvatar) {
    numeri.push({ v: String(usageCount), e: "Volte che ti hanno usato" });
  }

  // Il prezzo dello scatto in Alta, dalla stessa funzione che fa pagare. Il 23/9
  // qui c'era scritto 24 a mano, ed era 50: un prezzo non si scrive, si calcola.
  const voltAlta = splitEcho(null, "1024x1536", "high").gross_cents;

  // ── I MATTONI DELLE SCHEDE ─────────────────────────────────────────────
  const cardVolt = volt !== null && (
    <div className="card bg-[radial-gradient(58%_46%_at_97%_-12%,var(--amber-soft),transparent_62%)] p-5">
      <p className="kicker">I TUOI VOLT</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span aria-hidden className="text-[1.3rem]">⚡</span>
        <span className={`text-[2.6rem] font-bold leading-none tracking-[-0.045em] ${volt <= 0 ? "text-blocked" : volt < LOW_BALANCE_THRESHOLD ? "text-amber-ink" : ""}`}>
          {volt.toLocaleString("it-IT")}
        </span>
      </div>
      <p className="mt-2.5 text-[0.82rem] leading-relaxed text-muted">
        {volt <= 0
          ? "Energia esaurita: ricarica per generare."
          : volt < LOW_BALANCE_THRESHOLD
            ? "Batteria quasi scarica."
            : `Un VOLT è un centesimo. Uno scatto in Alta verticale ne costa ${voltAlta}.`}
      </p>
      <Link href="/account/volt" className="mt-4 block rounded-full bg-amber px-4 py-2.5 text-center text-[0.88rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
        Ricarica
      </Link>
    </div>
  );

  const cardStato = (
    <div className="card p-5">
      <p className="kicker">IL TUO ACCOUNT</p>
      <div className="mt-3 flex flex-col">
        <Riga k="Tipo di account" v={ROLE_LABEL[role] ?? role} />
        {role === "seller" && <Riga k="Verifica identità (KYC)" v={kyc.text} colore={kyc.color} />}
        {role === "seller" && myAvatar && <Riga k="Il tuo volto" v={`@${myAvatar}`} />}
      </div>
      {role === "seller" && (profile?.kyc_status ?? "none") !== "approved" && (
        <Link href="/account/verify" className="mt-4 block rounded-full bg-amber px-4 py-2.5 text-center text-[0.88rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
          {profile?.kyc_status === "rejected" ? "Riprova la verifica" : "Verifica ora la tua identità"}
        </Link>
      )}
      {role === "buyer" && (user.user_metadata as { account_intent?: string } | null)?.account_intent === "enterprise" && (
        <Link href="/enterprise/register" className="mt-4 block rounded-full bg-amber px-4 py-2.5 text-center text-[0.88rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
          Completa la registrazione della tua azienda
        </Link>
      )}
    </div>
  );

  const cardProtezione = protection && (
    <div className="card border-amber/35 p-5">
      <p className="kicker">IL TUO VOLTO È PROTETTO</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-verified/30 bg-verified-soft px-3 py-2.5">
        <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-verified" />
        <span className="text-[0.82rem] font-bold text-on-verified">Dentro Semblic il tuo volto non può essere generato né concesso.</span>
      </div>
      {protection.total > 0 ? (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[2.1rem] font-bold leading-none tracking-[-0.04em]">{protection.total}</span>
            <span className="text-[0.85rem] leading-snug text-muted">
              {protection.total === 1 ? "volta il tuo volto è stato riconosciuto" : "volte il tuo volto è stato riconosciuto"} in immagini caricate su Semblic
              {protection.last30 > 0 && ` (${protection.last30} negli ultimi 30 giorni)`}
            </span>
          </div>
          <p className="mt-2.5 text-[0.82rem] leading-relaxed text-muted">
            Qualcuno ha caricato qui un&apos;immagine in cui compare il tuo volto: può essere un contenuto creato fuori da Semblic. Conserviamo la traccia per te.
          </p>
          <div className="mt-4 flex flex-col">
            {protection.recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-t border-hairline-soft py-2 text-[0.8rem]">
                <span className="text-muted">{new Date(a.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                {a.similarity !== null && <span className="font-bold text-amber-ink">somiglianza ~{a.similarity}%</span>}
              </div>
            ))}
          </div>
          {protection.total > protection.recent.length && (
            <p className="mt-2 text-[0.72rem] text-faint">e altri {protection.total - protection.recent.length} eventi più vecchi.</p>
          )}
          <Link href="/signup/avatar/protected" className="mt-4 block rounded-full border border-amber/40 bg-amber-soft px-4 py-2.5 text-center text-[0.85rem] font-bold text-amber-ink transition-colors hover:border-amber">
            Gestisci la tua protezione
          </Link>
        </>
      ) : (
        <p className="mt-4 text-[0.82rem] leading-relaxed text-muted">
          Nessun tentativo rilevato finora. Se qualcuno carica su Semblic un&apos;immagine col tuo volto, lo vedrai qui.
        </p>
      )}
      <p className="mt-4 text-[0.7rem] leading-relaxed text-faint">
        Dentro Semblic la protezione è garantita lato server. Fuori da qui possiamo avvisarti e aiutarti a chiedere la rimozione, non impedirlo in assoluto. La tutela legale è in revisione.
      </p>
    </div>
  );

  const cardVolto = role === "seller" && (
    <div className="card p-5">
      <p className="kicker">IL TUO VOLTO</p>
      {myAvatar ? (
        <div className="mt-3 flex flex-col gap-3">
          {soulActive ? (
            <div className="flex items-center gap-2 rounded-xl border border-verified/30 bg-verified-soft px-3 py-2.5">
              <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-verified" />
              <span className="text-[0.82rem] font-bold text-on-verified">Soul attivo, il tuo avatar è generabile</span>
            </div>
          ) : (
            <div className="rounded-xl border border-amber/25 bg-[var(--bg)] p-4">
              <p className="kicker mb-3">ATTIVA IL TUO SOUL</p>
              <SoulActivate />
            </div>
          )}
          <Link href={`/passport/${myAvatar}`} className="block rounded-full border border-amber/30 bg-amber-soft px-4 py-2.5 text-center text-[0.85rem] font-semibold transition-colors hover:border-amber">
            Vai al tuo passaporto pubblico
          </Link>
          <Link href="/account/consent" className="block rounded-full border border-border px-4 py-2.5 text-center text-[0.85rem] font-semibold text-muted transition-colors hover:border-amber/60 hover:text-foreground">
            Gestisci il consenso
          </Link>
          <LinkWallet initialWallet={myWallet} />
        </div>
      ) : isVerifiedSeller ? (
        <Link href="/account/avatar" className="mt-3 block rounded-full bg-amber px-4 py-2.5 text-center text-[0.88rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
          Crea il tuo avatar nel registro
        </Link>
      ) : (
        <p className="mt-3 text-[0.85rem] leading-relaxed text-muted">Verifica prima la tua identità per poter creare il tuo avatar.</p>
      )}
    </div>
  );

  const cardPortafoglio = role === "seller" && myAvatar && (
    <div className="card bg-[radial-gradient(55%_38%_at_97%_-10%,var(--verified-soft),transparent_60%)] p-5">
      <p className="kicker">IL TUO PORTAFOGLIO</p>
      <div className="mt-3">
        <span className="text-[0.8rem] text-muted">Royalty accumulate</span>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-2.5">
          <span className="text-[2.9rem] font-bold leading-none tracking-[-0.04em] text-verified">{formatEur(royaltyCents)}</span>
          {revenue && revenue.last30Cents > 0 && (
            <span className="text-[0.85rem] font-bold text-amber-ink">
              +{formatEur(revenue.last30Cents)} <span className="font-medium text-muted">ultimi 30 giorni</span>
              {revenue.deltaPct !== null && (
                <span className={revenue.deltaPct >= 0 ? "ml-1.5 text-verified" : "ml-1.5 text-blocked"}>
                  {revenue.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(revenue.deltaPct)}%
                </span>
              )}
            </span>
          )}
        </div>
        <p className="mt-2 text-[0.78rem] text-faint">{usageCount} utilizzi totali</p>
      </div>

      {revenue && (
        <div className="mt-5">
          <RoyaltyCharts stats={revenue} />
        </div>
      )}

      <Link href="/account/attivita" className="mt-5 block rounded-full border border-verified/30 bg-verified-soft px-4 py-2 text-center text-[0.82rem] font-bold text-on-verified transition-colors hover:border-verified">
        Attività del mio volto
      </Link>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--hairline)]">
        <div className="h-full bg-[linear-gradient(90deg,var(--amber-c),var(--verified-c))]" style={{ width: `${Math.min(100, (royaltyCents / PAYOUT_THRESHOLD_CENTS) * 100)}%` }} />
      </div>
      <p className="mt-1.5 text-[0.76rem] text-muted">Soglia di pagamento: {formatEur(PAYOUT_THRESHOLD_CENTS)}</p>

      <div className="mt-4">
        <PayoutButton eligible={royaltyCents >= PAYOUT_THRESHOLD_CENTS} amount={formatEur(royaltyCents)} />
      </div>

      {payouts.length > 0 && (
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="kicker mb-3">STORICO PAGAMENTI</p>
          <div className="flex flex-col gap-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-[0.8rem] text-muted">{new Date(p.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[0.7rem] font-bold uppercase text-verified">{p.status}</span>
                  <span className="text-[0.88rem] font-bold">{formatEur(p.amount_cents)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const cardDomanda = role === "seller" && myAvatar && demand && demand.compatible > 0 && (
    <div className="card p-5">
      <p className="kicker">IL TUO VOLTO È STATO CERCATO</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[2.1rem] font-bold leading-none tracking-[-0.04em]">{demand.compatible}</span>
        <span className="text-[0.85rem] leading-snug text-muted">
          {demand.compatible === 1 ? "ricerca compatibile" : "ricerche compatibili"} col tuo volto negli ultimi {demand.days} giorni
        </span>
      </div>
      {demand.notGranted > 0 && (
        <>
          <div className="mt-4 rounded-xl border border-amber/30 bg-amber-soft px-3 py-2.5">
            <span className="text-[0.82rem] font-bold text-amber-ink">
              {demand.notGranted === 1 ? "1 era in una categoria che oggi non concedi" : `${demand.notGranted} erano in categorie che oggi non concedi`}
            </span>
          </div>
          <Link href="/account/consent" className="mt-3 block rounded-full border border-amber/30 bg-amber-soft px-4 py-2 text-center text-[0.82rem] font-bold text-amber-ink transition-colors hover:border-amber">
            Apri nuove categorie, decidi tu
          </Link>
        </>
      )}
      <p className="mt-4 text-[0.7rem] leading-relaxed text-faint">Registriamo solo la forma della domanda: chi cerca resta anonimo.</p>
    </div>
  );

  const cardRecluta = role === "buyer" && !protection && (user.user_metadata as { account_intent?: string } | null)?.account_intent !== "enterprise" && (
    <div className="rounded-[20px] border border-amber/30 bg-[linear-gradient(135deg,var(--amber-soft),transparent)] p-5">
      <p className="text-[1.05rem] font-bold tracking-[-0.02em]">Metti il tuo volto nel registro</p>
      <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted">
        Sei una persona reale: il tuo volto può entrare nel registro, restare sotto il tuo consenso e farti guadagnare ogni volta che viene usato. Tu decidi tutto, sempre.
      </p>
      <Link href="/scansione" className="mt-4 inline-block rounded-full bg-amber px-5 py-2.5 text-[0.85rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
        Scopri come entrare
      </Link>
    </div>
  );

  // In Panoramica solo gli ultimi, con il tasto per andare alla scheda piena:
  // la stessa griglia due volte sarebbe la stessa pagina due volte.
  const ultimiContenuti = myGenerations.length > 0 && (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">GLI ULTIMI CHE HAI FATTO</p>
          <p className="mt-1.5 text-[0.85rem] text-muted">Ogni scatto porta il suo certificato e la sua ricevuta.</p>
        </div>
        <VaiAllaScheda a="contenuti" className="focus-ring shrink-0 rounded-full border border-border px-4 py-2 text-[0.82rem] font-semibold text-muted transition-colors hover:border-amber/60 hover:text-foreground">
          {myGenerations.length > 4 ? `Vedi tutti e ${myGenerations.length}` : "Vedi tutti"}
        </VaiAllaScheda>
      </div>
      <div className="mt-4">
        <ContentsGrid items={gridItems.slice(0, 4)} shareVariant="buyer" />
      </div>
      <Link href="/account/progetti" className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-[0.88rem] font-semibold transition-colors hover:border-amber/60">
        <span>
          Raccogli gli scatti in una cartella
          <span className="ml-2 font-normal text-muted">e mandane il link al tuo cliente</span>
        </span>
        <span aria-hidden className="text-faint">→</span>
      </Link>
    </div>
  );

  const contenuti = myGenerations.length > 0 && (
    <div className="card p-5">
      <p className="kicker">I MIEI CONTENUTI</p>
      <div aria-hidden className="mt-3 mb-4 h-px bg-[linear-gradient(90deg,var(--amber-c),var(--hairline)_38%,transparent_80%)] opacity-60" />
      <VideoStrip items={myVideos} />
      <ContentsGrid items={gridItems} shareVariant="buyer" />
      <p className="mt-4 text-[0.7rem] leading-relaxed text-faint">Ogni contenuto è certificato e la persona reale è stata remunerata.</p>
    </div>
  );

  const cardOperatore = operatore && (
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <p className="kicker">LE COSE DA OPERATORE</p>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">Il numero rosso è quello che aspetta una risposta.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <LinkOperatore href="/account/kyc" l="Verifiche identità (KYC)" n={daKyc} />
          <LinkOperatore href="/account/review" l="Volti da approvare" n={daVolti} />
          <LinkOperatore href="/account/kyb-review" l="Verifiche aziende (KYB)" n={0} />
          <LinkOperatore href="/account/reports" l="Segnalazioni di abuso" n={daSegnalazioni} />
          <LinkOperatore href="/account/messaggi" l="Messaggi dal sito" n={messaggiAperti} />
          <LinkOperatore href="/account/face-index" l="Indice volti del registro" n={0} />
        </div>
      </div>
      <AnchorPanel />
      <VoltGrantPanel />
    </div>
  );

  const cardOrg = role === "enterprise" && (
    <div className="flex flex-col gap-4">
      <OrgAvatars avatars={orgAvatars} kyb={orgKyb} />
      <Link href="/account/attivita" className="block rounded-full border border-verified/30 bg-verified-soft px-4 py-2.5 text-center text-[0.85rem] font-bold text-on-verified transition-colors hover:border-verified">
        Attività dei tuoi volti
      </Link>
    </div>
  );

  // ── LE SCHEDE ──────────────────────────────────────────────────────────
  const schede: Scheda[] = [
    {
      id: "panoramica",
      l: "Panoramica",
      nodo: (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-4">
            {activeJobs.length > 0 && <ActiveJobs initial={activeJobs} />}
            {cardOrg}
            {cardPortafoglio}
            {cardDomanda}
            {cardRecluta}
            {ultimiContenuti}
          </div>
          <div className="flex flex-col gap-4">
            {cardVolt}
            <Invita />
            {cardStato}
            {cardProtezione}
            {cardVolto}
          </div>
        </div>
      ),
    },
  ];
  if (myGenerations.length > 0) {
    schede.push({ id: "contenuti", l: "I miei contenuti", badge: myGenerations.length, nodo: contenuti });
  }
  if (role === "seller") {
    schede.push({
      id: "volto",
      l: "Il mio volto",
      nodo: (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-4">{cardPortafoglio || <div className="card p-5 text-[0.9rem] text-muted">Quando il tuo volto entra nel registro, qui compaiono guadagni e utilizzi.</div>}{cardDomanda}</div>
          <div className="flex flex-col gap-4">
            {cardVolto}
            {wardAvatarId && <WardVolto attivo={wardAcceso} avatarId={wardAvatarId} ultimi={wardTrovate} />}
          </div>
        </div>
      ),
    });
  }
  if (protection) {
    schede.push({ id: "protezione", l: "Protezione", nodo: <div className="max-w-2xl">{cardProtezione}</div> });
  }
  if (operatore) {
    schede.push({ id: "operatore", l: "Operatore", badge: daOperatore || null, nodo: cardOperatore });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <SiteNav />
        <MarkContentsSeen />

        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
          {/* ── Testata ── */}
          <div className="flex flex-wrap items-center gap-4">
            <span aria-hidden className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--amber-c),#E0715F)] text-[1.25rem] font-bold text-white">
              {(profile?.full_name || user.email || "?").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[1.7rem] font-bold leading-tight tracking-[-0.035em] sm:text-[2rem]">
                Ciao, {profile?.full_name || "utente"}
              </h1>
              <p className="truncate font-mono text-[0.78rem] text-faint">{user.email}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {profile?.kyc_status === "approved" && <VerifiedBadge />}
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.72rem] font-semibold text-muted">{ROLE_LABEL[role] ?? role}</span>
              <LogoutButton />
            </div>
          </div>
          <div aria-hidden className="mt-4 h-px bg-[linear-gradient(90deg,var(--amber-c),var(--hairline)_34%,transparent_72%)] opacity-70" />

          <Quadro numeri={numeri} />

          <Linguette schede={schede} />

          <p className="mt-10 text-center text-[0.78rem] leading-relaxed text-faint">
            Il tuo profilo è protetto: solo tu puoi vederlo e modificarlo.
          </p>
        </main>
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/35 bg-verified-soft px-2.5 py-1">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--verified-c)" strokeWidth="3" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span className="text-[0.72rem] font-bold tracking-[0.04em] text-on-verified">Creatore verificato</span>
    </span>
  );
}

function Riga({ k, v, colore }: { k: string; v: string; colore?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2.5 first:border-t-0 first:pt-0">
      <span className="text-[0.85rem] text-muted">{k}</span>
      <span className="text-[0.88rem] font-semibold" style={colore ? { color: colore } : undefined}>{v}</span>
    </div>
  );
}

function LinkOperatore({ href, l, n }: { href: string; l: string; n: number }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-3 text-[0.85rem] font-semibold transition-colors hover:border-amber/60">
      {l}
      {n > 0 && <span className="rounded-full bg-blocked-soft px-2 py-px font-mono text-[0.65rem] font-bold text-on-blocked">{n}</span>}
    </Link>
  );
}
