import Link from "next/link";
import { Lock, CalendarRange, UserCheck, BadgeCheck, HeartHandshake, RefreshCcw } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { InquiryForm } from "@/components/business/InquiryForm";

export const metadata = {
  title: "Enterprise: Roster riservato",
  description:
    "Licenza prioritaria a tempo: riserva un volto verificato per la tua categoria merceologica. Il volto resta della persona, il tuo brand ha l'esclusiva di categoria.",
};

// B2 — Enterprise / roster riservato (EXPANSION_V3): licenza prioritaria a
// tempo per i brand. Tecnicamente è un'estensione dello scope di consenso
// (categoria riservata nel ledger per la durata del contratto) — qui la
// proposta di valore + contatto commerciale; il flusso completo dopo il lancio.
export default function EnterprisePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        {/* Hero */}
        <section className="mx-auto max-w-3xl px-5 pb-14 pt-16 text-center sm:px-8 sm:pt-24">
          <span className="label-mono text-crimson-light">Enterprise</span>
          <h1 className="mt-4 text-balance text-4xl font-extralight leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            <KineticText text="Il volto giusto," />
            <span className="mt-2 block">
              <KineticText text="riservato al tuo" delay={0.25} />{" "}
              <KineticText text="brand" gradient delay={0.45} />
              <KineticText text="." delay={0.55} />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            La licenza prioritaria a tempo: ingaggi un volto verificato del registro per la tua
            categoria merceologica, per 6 o 12 mesi. Nessun concorrente potrà usarlo lì, finché è tuo.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#richiesta" className="rounded-full bg-violet-light px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-on-amber transition hover:brightness-110 focus-ring">
              Riserva un volto
            </a>
            <Link href="/enterprise/register" className="rounded-full border border-border px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-foreground transition hover:border-violet/50 focus-ring">
              Registra la tua agenzia
            </Link>
          </div>
          <p className="mt-3 text-xs text-faint">
            Sei un&apos;agenzia che gestisce dei volti? Registra l&apos;azienda, supera il KYB e onboarda il tuo roster.
          </p>
        </section>

        {/* Come funziona */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { Icon: UserCheck, t: "1 · Scegli il volto", d: "Dal catalogo verificato: persona reale, consenziente per la tua categoria, con storico di utilizzi visibile.", c: "#F2A93B" },
                { Icon: Lock, t: "2 · Riservi la categoria", d: "Per la durata del contratto la categoria è tua: la riserva vive nel registro dei consensi, non in una promessa.", c: "#EE7A70" },
                { Icon: CalendarRange, t: "3 · 6 o 12 mesi", d: "Canone ricorrente + royalty alla persona a ogni utilizzo. Alla scadenza: rinnovo prioritario o rilascio.", c: "#7FAE96" },
              ].map(({ Icon, t, d, c }) => (
                <div key={t} className="glass glass-hover rounded-2xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${c}1a`, border: `1px solid ${c}55` }}>
                    <Icon className="h-5 w-5" style={{ color: c }} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* I principi (l'etica resta) */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <span className="label-mono text-teal">I principi non si comprano</span>
            <h2 className="mt-3 max-w-2xl text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Esclusiva di categoria, mai esclusiva della persona.
            </h2>
            <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-3">
              {[
                { Icon: HeartHandshake, t: "Il volto resta suo", d: "La persona non si vende: concede. Fuori dalla tua categoria resta libera, e può sempre revocare." },
                { Icon: BadgeCheck, t: "Tutto certificato", d: "La riserva è un'estensione del consenso, tracciata nella timeline pubblica del passport." },
                { Icon: RefreshCcw, t: "La persona guadagna due volte", d: "Canone ricorrente per la riserva + royalty su ogni contenuto generato. È il modello, non un extra." },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
                  <div>
                    <h3 className="text-sm font-bold">{t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-faint">
              Il programma apre per gradi: i contratti di riserva passano dal nostro legale e
              dalla conferma esplicita della persona. Le prime aziende entrano in lista ora.
            </p>
          </section>
        </Reveal>

        {/* Form */}
        <Reveal>
          <section id="richiesta" className="mx-auto max-w-3xl px-5 py-12 pb-24 sm:px-8">
            <div className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(238,122,112,0.10),transparent_70%)]" />
              <div className="relative">
                <span className="label-mono text-crimson-light">Richiesta riservata</span>
                <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Dicci categoria e obiettivi.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                  Ti presentiamo i volti disponibili per la riserva nella tua categoria, con condizioni e tempi.
                </p>
                <div className="mt-8">
                  <InquiryForm
                    kind="enterprise"
                    messageLabel="Categoria e progetto"
                    messagePlaceholder="Categoria merceologica (es. skincare), durata desiderata, mercati, dove vivranno i contenuti…"
                    cta="Richiedi la riserva"
                  />
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
