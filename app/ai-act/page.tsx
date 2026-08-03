import Link from "next/link";
import { FileCheck2, ScanSearch, BadgeCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";

export const metadata = {
  title: "AI Act, conformi dal giorno uno",
  description:
    "Dal 2 agosto 2026 gli obblighi di trasparenza dell'AI Act sono legge: contenuti dichiarati, marcatura leggibile dalle macchine, persone tutelate. Semblic e' nata cosi'.",
  alternates: { canonical: "/ai-act" },
};

// Pagina /ai-act: la mappa "la legge chiede -> Semblic risponde". Niente
// consulenza legale: raccontiamo gli obblighi di trasparenza (art. 50, in
// applicazione dal 2 agosto 2026) e come il prodotto li copre per design.
const MAPPA = [
  {
    Icon: BadgeCheck,
    c: "#F2A93B",
    chiede: "Dichiarare i contenuti generati",
    dettaglio: "Chi pubblica immagini, video o audio generati o alterati dall'AI deve renderlo riconoscibile.",
    risponde: "Ogni generazione esce con un certificato pubblico e il badge «Volto Verificato».",
  },
  {
    Icon: FileCheck2,
    c: "#7FAE96",
    chiede: "Marcatura leggibile dalle macchine",
    dettaglio: "I contenuti sintetici devono portare un segno tecnico che le macchine possano rilevare.",
    risponde: "Filigrana invisibile e metadati di provenienza dentro ogni output, dal primo giorno.",
  },
  {
    Icon: ScanSearch,
    c: "#9B8CFF",
    chiede: "Verificabilita'",
    dettaglio: "La trasparenza vale se chiunque puo' controllare cosa ha davanti.",
    risponde: "Sigil, il verificatore pubblico: incolli un contenuto e sai chi c'e' dietro, in un clic.",
  },
  {
    Icon: ShieldCheck,
    c: "#EE7A70",
    chiede: "Persone reali tutelate",
    dettaglio: "I deepfake vanno dichiarati; l'identita' delle persone va protetta dagli abusi.",
    risponde: "Nessun volto senza consenso verificato e pagato; Ward trova le copie, Nemesis le fa rimuovere.",
  },
];

export default function AiActPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-mono text-teal">AI Act · in applicazione dal 2 agosto 2026</span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
              <KineticText text="La trasparenza e'" />
              <span className="mt-1 block">
                <KineticText text="diventata legge." delay={0.2} />
              </span>
              <span className="mt-1 block">
                <KineticText text="Noi eravamo gia' pronti" gradient delay={0.4} />
                <KineticText text="." delay={0.55} />
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Dal 2 agosto 2026 si applicano gli obblighi di trasparenza del Regolamento europeo
              sull&apos;intelligenza artificiale: i contenuti generati o modificati dall&apos;AI vanno
              dichiarati e resi riconoscibili. Semblic non si e&apos; adeguata: e&apos; nata cosi&apos;.
            </p>
          </div>

          <Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {MAPPA.map((m) => (
                <div key={m.chiede} className="glass glass-hover relative overflow-hidden rounded-[2rem] p-7">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${m.c}, transparent)` }} />
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${m.c}1a`, color: m.c }}>
                      <m.Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ background: `${m.c}1a`, color: m.c }}>
                      La legge chiede
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold leading-tight">{m.chiede}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{m.dettaglio}</p>
                  <p className="mt-3 text-sm leading-relaxed">
                    <span className="font-bold text-teal">Semblic risponde: </span>
                    {m.risponde}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-dashed px-5 py-4 text-center text-sm leading-relaxed text-muted" style={{ borderColor: "rgba(242,169,59,0.4)", background: "rgba(242,169,59,0.06)" }}>
              Le sanzioni previste arrivano a 15 milioni di euro o al 3% del fatturato globale.
              Per chi crea con Semblic la conformita&apos; non e&apos; un progetto: e&apos; il prodotto.
            </p>
          </Reveal>

          <Reveal>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/academy#aziende">Porta la tua azienda in regola</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/verify">Verifica un contenuto con Sigil</Link>
              </Button>
            </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
}
