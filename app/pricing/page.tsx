import Link from "next/link";
import { BAND_PRICE_CENTS, PLATFORM_FEE_BPS, splitRoyalty, formatEur } from "@/lib/wallet";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  title: "Prezzi — Human2AI",
  description: "Gratis per provare e per entrare. Paghi solo per generare sul serio.",
};

const feePct = PLATFORM_FEE_BPS / 100;

// Bande di prezzo per categoria d'uso (allineate a lib/wallet.ts).
const BANDS = [
  { key: "premium", label: "Premium", cats: "Luxury · Fashion · Beauty", cents: BAND_PRICE_CENTS.premium },
  { key: "standard", label: "Standard", cats: "Business · Travel · Entertainment · Sport · Alcohol", cents: BAND_PRICE_CENTS.standard },
  { key: "base", label: "Base", cats: "Food · Lifestyle · Healthcare", cents: BAND_PRICE_CENTS.base },
] as const;

interface Plan {
  name: string;
  who: string;
  price: string;
  accent: string;
  highlight?: string;
  recommended?: boolean;
  features: string[];
  cta: { label: string; href: string };
}

const PLANS: Plan[] = [
  {
    name: "Free",
    who: "Per provare",
    price: "€0",
    accent: "#6b7280",
    features: [
      "Sfoglia il registro dei volti reali",
      "Repertorio e anteprime di ogni Soul",
      "Verifica qualsiasi token di consenso",
    ],
    cta: { label: "Esplora il registro", href: "/" },
  },
  {
    name: "Creator",
    who: "Per chi mette il proprio volto",
    price: "€0",
    accent: "#00A896",
    highlight: "Sei tu il valore",
    features: [
      "Identità verificata (KYC) — un volto, tuo",
      "Soul creato a carico nostro",
      "Royalty dell'80% su ogni generazione",
      "Wallet, storico e payout a soglia",
      "Consenso revocabile in ogni momento",
    ],
    cta: { label: "Entra nel registro", href: "/signup" },
  },
  {
    name: "Pro",
    who: "Per chi genera",
    price: "a consumo",
    accent: "#6B21E8",
    recommended: true,
    features: [
      "Generazioni commerciali, full-res, senza watermark",
      "Tutti i modelli (Soul 2.0, Soul ID + stili)",
      "Licenza d'uso commerciale",
      "Certificato verificabile per ogni output",
      "Prezzo per categoria d'uso (vedi sotto)",
    ],
    cta: { label: "Trova un volto", href: "/match" },
  },
  {
    name: "Enterprise",
    who: "Agenzie e brand",
    price: "su misura",
    accent: "#B8005C",
    features: [
      "Onboarding multi-avatar",
      "Verifica rinforzata: face-match + revisione manuale",
      "Accesso API e prezzi a volume",
      "SLA e supporto dedicato",
    ],
    cta: { label: "Contattaci", href: "mailto:hello@human2ai.example?subject=Enterprise" },
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-12 text-center">
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Gratis per provare. <span className="text-gradient">Paghi per generare sul serio.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Entrare e provare non costa nulla. Chi mette il proprio volto viene pagato.
              Si paga solo l&apos;uso commerciale — e la persona reale prende l&apos;{100 - feePct}%.
            </p>
          </div>

          {/* Piani */}
          <div className="mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.name}
                className={`glass flex flex-col rounded-2xl p-6 ${p.recommended ? "shadow-[0_0_40px_rgba(107,33,232,0.18)]" : ""}`}
                style={p.recommended ? { borderColor: "rgba(107,33,232,0.5)" } : undefined}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg font-extrabold" style={{ color: p.accent }}>{p.name}</span>
                  {p.recommended && <span className="rounded-full border border-violet/30 bg-violet/15 px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-violet-light">CONSIGLIATO</span>}
                </div>
                <p className="mb-3 text-sm text-muted">{p.who}</p>
                <div className="text-2xl font-extrabold">{p.price}</div>
                {p.highlight && <p className="mt-1 text-sm font-bold text-teal">{p.highlight}</p>}
                <ul className="my-5 flex flex-1 flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm leading-snug text-muted">
                      <span className="shrink-0" style={{ color: p.accent }}>›</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={p.cta.href}
                  className={`block rounded-xl px-4 py-3 text-center text-sm font-bold text-white transition-all ${
                    p.recommended ? "bg-[linear-gradient(135deg,#6B21E8,#B8005C)] shadow-[0_8px_30px_rgba(107,33,232,0.3)] hover:brightness-110" : "border border-white/15 bg-white/5 hover:bg-white/10"
                  }`}>
                  {p.cta.label}
                </Link>
              </div>
            ))}
          </div>

          {/* Quanto costa generare */}
          <div className="mb-12">
            <h2 className="text-center text-2xl font-extrabold tracking-tight">Quanto costa generare</h2>
            <p className="mx-auto mt-2 mb-8 max-w-xl text-center text-sm text-muted">
              Il prezzo dipende dalla categoria d&apos;uso. Su ogni generazione la persona reale riceve l&apos;{100 - feePct}%, la piattaforma il {feePct}%.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {BANDS.map((b) => {
                const split = splitRoyalty(b.cents);
                return (
                  <div key={b.key} className="glass rounded-2xl p-6">
                    <p className="mb-1 text-xs tracking-[0.1em] text-muted">{b.label.toUpperCase()}</p>
                    <div className="text-3xl font-extrabold">{formatEur(b.cents)}</div>
                    <p className="mt-1 mb-4 text-sm leading-relaxed text-faint">{b.cats}</p>
                    <div className="flex justify-between border-t border-white/6 pt-3">
                      <span className="text-sm font-bold text-teal">Royalty alla persona</span>
                      <span className="text-sm font-extrabold text-teal">{formatEur(split.net_cents)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strip fiducia */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Consenso verificato", d: "Identità reale via KYC. Nessuno spam, nessun volto rubato." },
              { t: "Token verificabile", d: "Ogni volto e ogni generazione hanno un certificato controllabile da chiunque." },
              { t: "La persona viene pagata", d: "Royalty all'80%, wallet e payout. Mai un umano generato gratis." },
              { t: "Revocabile", d: "Il consenso è una timeline: si può revocare per il futuro, sempre." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
                <p className="mb-1 text-sm font-bold">{x.t}</p>
                <p className="text-sm leading-relaxed text-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
