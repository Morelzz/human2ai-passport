import Link from "next/link";
import { Clapperboard, Building2, Code2 } from "lucide-react";
import { SectionTitle } from "@/components/marketing/SectionTitle";

// [STRUMENTI E AZIENDE], casa nuova: tre card chiare, solo gli strumenti che
// esistono davvero. Niente segnaposto "in arrivo": lo spazio si aggiunge
// quando c'e' qualcosa da metterci.
const STRUMENTI = [
  { Icon: Clapperboard, t: "Studio", d: "Genera e post-produci con i volti del registro.", href: "/studio" },
  { Icon: Building2, t: "Enterprise", d: "Integrazione e volumi per i brand.", href: "/enterprise" },
  { Icon: Code2, t: "API del consenso", d: "Il consenso come endpoint, dentro i tuoi sistemi.", href: "/sviluppatori" },
];

export function ToolsBusiness() {
  return (
    <section className="mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-24">
      <SectionTitle kicker="Strumenti e aziende" subtitle="Generare con persone vere e consenzienti, con la prova del consenso in ogni contenuto.">
        Crea con volti veri, senza rischi legali.
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        {STRUMENTI.map(({ Icon, t, d, href }) => (
          <Link key={t} href={href} className="card group flex flex-col gap-3 p-6 transition-colors hover:border-amber/60 sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-soft text-amber-ink">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-[1.25rem] font-bold tracking-[-0.02em]">{t}</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted">{d}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
