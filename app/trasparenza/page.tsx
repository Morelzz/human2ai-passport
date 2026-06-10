import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { getPublicAvatars } from "@/lib/registry";
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

  const stats = [
    { label: "Persone reali nel registro", value: String(avatarsTotal ?? 0), c: "#8b47f0" },
    { label: "Consensi attivi", value: String(avatarsActive ?? 0), c: "#00A896" },
    { label: "Generazioni certificate", value: String(genCount), c: "#B8005C" },
    { label: "Maturato per le persone reali", value: formatEur(royaltyAccrued), c: "#00A896" },
    { label: "Già erogato (payout)", value: formatEur(payoutPaid), c: "#8b47f0" },
    { label: "Payout effettuati", value: String(payoutCount), c: "#9ca3af" },
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

          {/* Il numero MANIFESTO: il filtro che blocca. Mostrato con orgoglio. */}
          <div className="reveal glass relative mb-10 overflow-hidden rounded-[2rem] p-8 text-center sm:p-10">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_90%_at_50%_0%,rgba(184,0,92,0.16),transparent_70%)]" />
            <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,#B8005C,transparent)]" />
            <div className="relative">
              <span className="label-mono text-crimson-light">Il filtro al lavoro</span>
              <div className="mt-4 font-mono text-6xl font-extrabold leading-none text-crimson sm:text-7xl">
                {blockedMonth ?? 0}
              </div>
              <p className="mx-auto mt-4 max-w-md text-balance text-lg font-semibold leading-snug text-foreground">
                richieste di generare un essere umano <span className="text-crimson">rifiutate questo mese</span> per mancanza di consenso.
              </p>
              <p className="mt-2 text-sm text-faint">
                {blockedTotal ?? 0} da sempre · ogni blocco è il filtro che fa il suo lavoro.
              </p>
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
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(107,33,232,0.18),transparent_70%)]" />
            <div className="relative">
              <span className="label-mono text-violet-light">La visione</span>
              <h2 className="mt-2 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Presto, generare un volto <span className="text-crimson">senza consenso</span> sarà <span className="text-gradient">impossibile</span>.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-muted">
                Human2AI non è un generatore: è il <span className="text-foreground">registro dei diritti d&apos;immagine</span> —
                la &quot;SIAE dei volti umani&quot;. La nostra missione è rendere la <span className="text-foreground">certificazione del consenso obbligatoria</span>:
                un filtro che si aggancia sopra i sistemi di IA generativa più potenti, così che <span className="text-foreground">nessun
                essere umano venga più generato nell&apos;anonimato</span> e <span className="text-foreground">ogni persona venga retribuita</span> ogni volta che il suo volto viene usato.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { t: "Il filtro umano", d: "Prima di ogni generazione di un volto, il passaggio dal consenso verificato." },
                  { t: "Ogni uso pagato", d: "Royalty alla persona reale, tracciabili e portabili — anche on-chain." },
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
