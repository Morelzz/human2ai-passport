import Link from "next/link";
import { Clapperboard, Building2, Code2 } from "lucide-react";

// [STRUMENTI E AZIENDE] — Sezione nuova, ultima prima della chiusura: vetrina
// B2B con i tool gia attivi PIU slot per quelli in arrivo (lo spazio dove
// entreranno i prossimi strumenti). Regola copy: niente trattini lunghi.

const ACTIVE = [
  { Icon: Clapperboard, t: "Studio", d: "Genera e post-produci con i volti del registro.", href: "/studio" },
  { Icon: Building2, t: "Enterprise", d: "Integrazione e volumi per i brand.", href: "/enterprise" },
  { Icon: Code2, t: "API filtro", d: "Il consenso come endpoint, dentro i tuoi sistemi.", href: "/sviluppatori" },
];

export function ToolsBusiness() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="max-w-2xl">
        <span className="label-mono text-violet-light">Strumenti e aziende</span>
        <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          La piattaforma per i brand che creano con l&apos;AI.
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          Generare con volti veri e consenzienti, senza rischi legali. Lo spazio crescera.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVE.map(({ Icon, t, d, href }) => (
          <Link key={t} href={href} className="glass glass-hover group rounded-2xl p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber/40 bg-amber/10">
              <Icon className="h-5 w-5 text-amber" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{t}</h3>
              <span className="label-mono text-teal">Attivo</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
          </Link>
        ))}

        {[0, 1, 2].map((i) => (
          <div key={`soon-${i}`} className="rounded-2xl border border-dashed border-border/70 p-6 opacity-70">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--edge)" }} />
            </div>
            <h3 className="text-lg font-bold text-muted">In arrivo</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-faint">Spazio riservato ai prossimi strumenti.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
