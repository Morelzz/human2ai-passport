import Link from "next/link";
import { BAND_PRICE_CENTS, PLATFORM_FEE_BPS, splitRoyalty, formatEur } from "@/lib/wallet";

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
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/match" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Trova un volto</Link>
          <Link href="/account" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Account</Link>
        </div>
      </nav>

      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, margin: "0 0 1rem" }}>
            Gratis per provare. <span style={{ color: "#6B21E8" }}>Paghi per generare sul serio.</span>
          </h1>
          <p style={{ color: "#6b7280", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Entrare e provare non costa nulla. Chi mette il proprio volto viene pagato.
            Si paga solo l&apos;uso commerciale — e la persona reale prende l&apos;{100 - feePct}%.
          </p>
        </div>

        {/* Piani */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem", marginBottom: "4rem" }}>
          {PLANS.map((p) => (
            <div key={p.name} style={{
              background: "#12121a",
              border: `1px solid ${p.recommended ? "rgba(107,33,232,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 18, padding: "1.6rem", display: "flex", flexDirection: "column",
              boxShadow: p.recommended ? "0 0 40px rgba(107,33,232,0.12)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", color: p.accent }}>{p.name}</span>
                {p.recommended && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#6B21E8", background: "rgba(107,33,232,0.14)", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 999, padding: "0.1rem 0.5rem", letterSpacing: "0.05em" }}>CONSIGLIATO</span>}
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.8rem" }}>{p.who}</p>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 0.2rem" }}>{p.price}</div>
              {p.highlight && (
                <p style={{ color: "#00A896", fontSize: "0.78rem", fontWeight: 700, margin: "0 0 0.8rem" }}>{p.highlight}</p>
              )}
              <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: "0.5rem", color: "#9ca3af", fontSize: "0.84rem", lineHeight: 1.4 }}>
                    <span style={{ color: p.accent, flexShrink: 0 }}>›</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={p.cta.href} style={{
                display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 10,
                background: p.recommended ? "linear-gradient(135deg,#6B21E8,#B8005C)" : "rgba(255,255,255,0.05)",
                border: p.recommended ? "none" : "1px solid rgba(255,255,255,0.12)",
                color: "#fff", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none",
              }}>
                {p.cta.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Quanto costa generare */}
        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.5rem", textAlign: "center" }}>Quanto costa generare</h2>
          <p style={{ color: "#6b7280", fontSize: "0.92rem", textAlign: "center", margin: "0 0 2rem" }}>
            Il prezzo dipende dalla categoria d&apos;uso. Su ogni generazione la persona reale riceve l&apos;{100 - feePct}%, la piattaforma il {feePct}%.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {BANDS.map((b) => {
              const split = splitRoyalty(b.cents);
              return (
                <div key={b.key} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.1em", margin: "0 0 0.4rem" }}>{b.label.toUpperCase()}</p>
                  <div style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.2rem" }}>{formatEur(b.cents)}</div>
                  <p style={{ color: "#374151", fontSize: "0.78rem", margin: "0 0 1rem", lineHeight: 1.5 }}>{b.cats}</p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#00A896", fontSize: "0.82rem", fontWeight: 700 }}>Royalty alla persona</span>
                    <span style={{ color: "#00A896", fontSize: "0.82rem", fontWeight: 800 }}>{formatEur(split.net_cents)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strip fiducia */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {[
            { t: "Consenso verificato", d: "Identità reale via KYC. Nessuno spam, nessun volto rubato." },
            { t: "Token verificabile", d: "Ogni volto e ogni generazione hanno un certificato controllabile da chiunque." },
            { t: "La persona viene pagata", d: "Royalty all'80%, wallet e payout. Mai un umano generato gratis." },
            { t: "Revocabile", d: "Il consenso è una timeline: si può revocare per il futuro, sempre." },
          ].map((x) => (
            <div key={x.t} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "1.2rem" }}>
              <p style={{ color: "#f0f0f5", fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.4rem" }}>{x.t}</p>
              <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0, lineHeight: 1.5 }}>{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
