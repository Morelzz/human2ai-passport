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
          <div className="mb-12 text-center">
            <span className="text-xs font-bold tracking-[0.14em] text-teal">TRASPARENZA</span>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">La prova è nei numeri</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Ogni volto è una persona reale che ha acconsentito. Ogni generazione è tracciata e
              paga chi c&apos;è dietro. Niente di nascosto: questi sono i numeri del registro.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="glass glass-hover rounded-2xl p-6">
                <div className="text-4xl font-extrabold leading-none" style={{ color: s.c }}>{s.value}</div>
                <p className="mt-2 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-xl text-center text-xs leading-relaxed text-faint">
            Nessun dato personale o biometrico è esposto. Solo aggregati. Ogni contenuto è
            verificabile dal suo certificato in <Link href="/verify" className="text-teal hover:underline">/verify</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
