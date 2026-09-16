import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import FilterDemo from "./FilterDemo";

export const metadata = {
  title: "Il Filtro Semblic (API) · Sviluppatori",
  description:
    "Prima di generare un essere umano, qualsiasi sistema può chiedere a Semblic se quella persona ha acconsentito. Il filtro del consenso, via API.",
};

// Pagina ADDITIVA: documenta l'API filtro (consent-check) + demo live.
// Realizza la Fase 2 della roadmap pubblica: "Il Filtro per tutti".
export default function SviluppatoriPage() {
  const exampleResponse = `{
  "semblic": "consent-filter",
  "subject": "random",
  "requested_use": "Fashion",
  "allowed": true,
  "decision": "ALLOW",
  "reason": "Consenso attivo per la categoria \\"Fashion\\".",
  "consent": { "status": "active", "since": "…", "revoked_at": null },
  "categories_allowed": ["Food", "Fashion", "Travel"],
  "proof": {
    "token": "…",
    "verify_url": "…/verify?token=…",
    "passport_url": "…/passport/random"
  }
}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-10">
            <span className="kicker">Fase 2 · il filtro per tutti</span>
            <h1 className="mt-2 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Il filtro del consenso, via API.
            </h1>
            <p className="mt-4 leading-relaxed text-muted">
              Prima di generare un essere umano, qualsiasi sistema può chiedere a Semblic se quella
              persona ha <span className="text-foreground">acconsentito</span>, per quella categoria d&apos;uso.
              È il passaggio che trasforma il consenso in <span className="text-foreground">infrastruttura</span>:
              senza <code className="rounded bg-verified-soft px-1.5 py-0.5 font-mono text-sm text-verified">ALLOW</code>, non si genera.
            </p>
          </div>

          {/* Demo live */}
          <FilterDemo />

          {/* Endpoint */}
          <section className="mt-12">
            <h2 className="text-xl font-bold">L&apos;endpoint</h2>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-border p-4 text-sm leading-relaxed">
              <code className="text-foreground">GET /api/filter?subject=<span className="text-verified">&lt;handle&gt;</span>&amp;use=<span className="text-verified">&lt;categoria&gt;</span></code>
            </pre>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li><code className="font-mono text-amber-ink">subject</code>: l&apos;handle della persona nel registro (obbligatorio).</li>
              <li><code className="font-mono text-amber-ink">use</code>: la categoria d&apos;uso da verificare (opzionale): Business, Fashion, Beauty, Sport, …</li>
            </ul>
          </section>

          {/* Esempio risposta */}
          <section className="mt-10">
            <h2 className="text-xl font-bold">La risposta</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sempre <code className="font-mono text-amber-ink">ALLOW</code> o <code className="font-mono text-amber-ink">BLOCK</code>,
              con il motivo e la <span className="text-foreground">prova pubblica</span>{" "}(token, link di verifica, passaporto).
              Il consenso è una timeline: una revoca rende <code className="font-mono">BLOCK</code> in tempo reale.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-border p-4 text-xs leading-relaxed text-muted">
              <code>{exampleResponse}</code>
            </pre>
          </section>

          <p className="mt-10 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">
            <span className="font-semibold text-foreground">Nota.</span>{" "}Questa è una demo pubblica in sola
            lettura. In produzione il filtro precede ogni generazione e ogni contenuto autorizzato esce con
            <span className="text-foreground"> filigrana invisibile</span> e <span className="text-foreground">certificato verificabile</span>,
            così la prova viaggia ovunque, anche fuori dalla piattaforma.
          </p>
        </main>
        <Footer />
      </div>
    </div>
  );
}
