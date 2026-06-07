import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { formatEur } from "@/lib/wallet";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  title: "Trasparenza — Human2AI",
  description: "I numeri reali del registro: persone consenzienti, generazioni certificate, royalty pagate.",
};

// Pagina pubblica: prova vivente del modello. Solo aggregati, nessun dato personale.
export default async function TrasparenzaPage() {
  const sb = createServerClient();

  const { count: avatarsTotal } = await sb.from("avatars").select("id", { count: "exact", head: true });
  const { count: avatarsActive } = await sb.from("avatars").select("id", { count: "exact", head: true }).is("revoked_at", null);

  const { data: gens } = await sb.from("generations").select("royalty_cents").not("certificate", "is", null);
  const genCount = gens?.length ?? 0;
  const royaltyAccrued = (gens ?? []).reduce((s, g) => s + (g.royalty_cents ?? 0), 0);

  const { data: pays } = await sb.from("payouts").select("amount_cents");
  const payoutCount = pays?.length ?? 0;
  const payoutPaid = (pays ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0);

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
            <span className="text-xs font-bold tracking-[0.14em] text-teal">TRASPARENZA</span>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">La prova è nei numeri</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Ogni volto è una persona reale che ha acconsentito. Ogni generazione è tracciata e
              paga chi c&apos;è dietro. Niente di nascosto: questi sono i numeri del registro.
            </p>
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
              <span className="text-xs font-bold tracking-[0.14em] text-violet-light">LA VISIONE</span>
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

          {/* ── ROADMAP ──────────────────────────────────────────────── */}
          <div className="mt-16">
            <div className="reveal text-center">
              <span className="text-xs font-bold tracking-[0.14em] text-teal">ROADMAP</span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">La strada verso lo standard globale</h2>
            </div>
            <ol className="relative mt-10 ml-3 border-l border-white/10">
              {[
                { q: "Q1", c: "#8b47f0", t: "Lancio della piattaforma", d: "Il registro pubblico dei volti consenzienti: identità, consenso-timeline, verifica, filigrana invisibile e proprietà soulbound." },
                { q: "Q2", c: "#B8005C", t: "Integrazione con i sistemi generativi", d: "Aggancio via API/filtro ai motori di generazione, per testare su larga scala il passaggio obbligato dal consenso." },
                { q: "Q3", c: "#00A896", t: "Conversione di massa", d: "Adozione mobile-first: ogni volto diventa un'identità verificata e pagata. Lo standard diventa abitudine." },
                { q: "Q4", c: "#8b47f0", t: "Infrastruttura e scala globale", d: "Data center a basso impatto ambientale, diffusione internazionale e il diritto d'immagine come standard riconosciuto." },
              ].map((p, i) => (
                <li key={p.q} className="reveal relative mb-8 pl-8" style={{ animationDelay: `${0.08 * i}s` }}>
                  <span className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 border-obsidian" style={{ background: p.c }} />
                  <div className="glass rounded-2xl p-5">
                    <span className="text-xs font-extrabold tracking-widest" style={{ color: p.c }}>{p.q}</span>
                    <h3 className="mt-1 text-lg font-bold">{p.t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="mx-auto mt-14 max-w-xl text-center text-xs leading-relaxed text-faint">
            Nessun dato personale o biometrico è esposto. Solo aggregati. Ogni contenuto è
            verificabile dal suo certificato in <Link href="/verify" className="text-teal hover:underline">/verify</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
