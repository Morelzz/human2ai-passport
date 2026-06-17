import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { getPublicAvatars, countProtectedFaces } from "@/lib/registry";
import { countBlockedThisMonth } from "@/lib/blocked";
import { formatEur } from "@/lib/wallet";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { PublicRoadmapCompact } from "@/components/marketing/PublicRoadmap";

export const metadata = {
  // Review B4: solo il nome pagina — il suffisso lo aggiunge il template layout.
  title: "Trasparenza",
  description: "I numeri reali del registro: persone consenzienti, generazioni certificate, royalty pagate.",
};

// Pagina pubblica: prova vivente del modello. Solo aggregati, nessun dato personale.
export default async function TrasparenzaPage() {
  const sb = createServerClient();

  // Fonte UNICA del registro pubblico (lib/registry): gli stessi volti contati
  // in home e catalogo — solo approvati, niente dati di test.
  const publicAvatars = await getPublicAvatars(sb);
  const avatarsTotal = publicAvatars.length;
  const avatarsActive = publicAvatars.filter((a) => !a.revoked_at).length;

  const { data: gens } = await sb.from("generations").select("royalty_cents").not("certificate", "is", null);
  const genCount = gens?.length ?? 0;
  const royaltyAccrued = (gens ?? []).reduce((s, g) => s + (g.royalty_cents ?? 0), 0);

  const { data: pays } = await sb.from("payouts").select("amount_cents");
  const payoutCount = pays?.length ?? 0;
  const payoutPaid = (pays ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  // Richieste BLOCCATE dal filtro del consenso (il numero manifesto: il filtro
  // che funziona). Mese corrente da lib/blocked (fonte unica, condivisa con
  // l'hero della home — review C3). Difensivo: tabella assente -> 0.
  const { count: blockedTotal } = await sb.from("blocked_requests").select("id", { count: "exact", head: true });
  const blockedMonth = await countBlockedThisMonth(sb);

  // Fase 4.1: il SECONDO numero manifesto — le persone che hanno registrato il
  // proprio volto per non essere generate (VETO). Reale dal DB, fonte unica.
  const protectedFaces = await countProtectedFaces(sb);

  const stats = [
    { label: "Persone reali nel registro", value: String(avatarsTotal ?? 0), c: "#F2A93B" },
    { label: "Consensi attivi", value: String(avatarsActive ?? 0), c: "#7FAE96" },
    { label: "Generazioni certificate", value: String(genCount), c: "#EE7A70" },
    { label: "Maturato per le persone reali", value: formatEur(royaltyAccrued), c: "#7FAE96" },
    { label: "Già erogato (payout)", value: formatEur(payoutPaid), c: "#F2A93B" },
    { label: "Payout effettuati", value: String(payoutCount), c: "rgba(242,233,216,0.45)" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
          {/* Intro */}
          <div className="reveal mb-12 text-center">
            <span className="label-mono text-teal">Transparency report</span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">La prova è nei numeri</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Ogni volto è una persona reale che ha acconsentito. Ogni generazione è tracciata e
              paga chi c&apos;è dietro. Niente di nascosto: questi sono i numeri del registro,
              letti in tempo reale.
            </p>
          </div>

          {/* I DUE numeri MANIFESTO (Fase 4.1): il filtro che blocca (richieste
              rifiutate) e le persone che hanno detto no (volti protetti). Reali dal DB. */}
          <div className="reveal mb-10 grid gap-4 sm:grid-cols-2">
            {/* 1. Il filtro al lavoro: richieste rifiutate questo mese (crimson) */}
            <div className="glass relative flex flex-col justify-center overflow-hidden rounded-[2rem] p-8 text-center">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(238,122,112,0.16),transparent_70%)]" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,#EE7A70,transparent)]" />
              <div className="relative">
                <span className="label-mono text-crimson-light">Il filtro al lavoro</span>
                <div className="mt-4 font-mono text-5xl font-extrabold leading-none text-crimson sm:text-6xl">
                  {blockedMonth ?? 0}
                </div>
                <p className="mx-auto mt-4 max-w-xs text-balance text-base font-semibold leading-snug text-foreground sm:text-lg">
                  richieste di generare un essere umano <span className="text-crimson">rifiutate questo mese</span> per mancanza di consenso.
                </p>
                <p className="mt-2 text-sm text-faint">
                  {blockedTotal ?? 0} da sempre.
                </p>
              </div>
            </div>

            {/* 2. Il diritto di dire no: volti protetti (violet) — VETO */}
            <div className="glass relative flex flex-col justify-center overflow-hidden rounded-[2rem] p-8 text-center">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(242,169,59,0.18),transparent_70%)]" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,#F2A93B,transparent)]" />
              <div className="relative">
                <span className="label-mono text-violet-light">Il diritto di dire no</span>
                <div className="mt-4 font-mono text-5xl font-extrabold leading-none text-violet-light sm:text-6xl">
                  {protectedFaces ?? 0}
                </div>
                <p className="mx-auto mt-4 max-w-xs text-balance text-base font-semibold leading-snug text-foreground sm:text-lg">
                  volti registrati <span className="text-violet-light">per non essere mai generati</span> dall&apos;IA.
                </p>
                <p className="mt-2 text-sm text-faint">
                  Dentro Semblic non sono generabili; fuori, allerta precoce e rimozione assistita.
                </p>
              </div>
            </div>
          </div>

          {/* Numeri */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s, i) => (
              <div key={s.label} className="reveal glass glass-hover rounded-2xl p-6" style={{ animationDelay: `${0.05 * i}s` }}>
                <div className="text-4xl font-extrabold leading-none" style={{ color: s.c }}>{s.value}</div>
                <div className="mt-3 h-1 w-12 rounded-full" style={{ background: s.c }} />
                <p className="mt-3 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── LA VISIONE ───────────────────────────────────────────── */}
          <div className="reveal glass relative mt-16 overflow-hidden rounded-[2rem] p-8 sm:p-12">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(242,169,59,0.18),transparent_70%)]" />
            <div className="relative">
              <span className="label-mono text-violet-light">La visione</span>
              <h2 className="mt-2 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Presto, generare un volto <span className="text-crimson">senza consenso</span> sarà <span className="text-gradient">impossibile</span>.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-muted">
                Semblic non è un generatore: è il <span className="text-foreground">registro dei diritti d&apos;immagine</span>,
                la &quot;SIAE dei volti umani&quot;. La nostra missione è rendere la <span className="text-foreground">certificazione del consenso obbligatoria</span>:
                un filtro che si aggancia sopra i sistemi di IA generativa più potenti, così che <span className="text-foreground">nessun
                essere umano venga più generato nell&apos;anonimato</span> e <span className="text-foreground">ogni persona venga retribuita</span> ogni volta che il suo volto viene usato.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { t: "Il filtro umano", d: "Prima di ogni generazione di un volto, il passaggio dal consenso verificato." },
                  { t: "Ogni uso pagato", d: "Royalty alla persona reale, tracciabili e portabili, anche on-chain." },
                  { t: "Prova ovunque", d: "Filigrana invisibile + certificato: l'origine è verificabile su qualsiasi piattaforma." },
                ].map((b) => (
                  <div key={b.t} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-sm font-bold">{b.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{b.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </section>

        {/* Review B5: qui solo la versione CONDENSATA — la roadmap completa
            vive in home (#la-strada). Stessa fonte dati (PHASES). */}
        <PublicRoadmapCompact />

        <section className="mx-auto max-w-xl px-5 pb-20 text-center sm:px-8">
          <p className="text-xs leading-relaxed text-faint">
            Nessun dato personale o biometrico è esposto. Solo aggregati. Ogni contenuto è
            verificabile dal suo certificato in <Link href="/verify" className="text-teal hover:underline">/verify</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
