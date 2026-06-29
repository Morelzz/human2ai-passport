import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { splitEcho, formatEur } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";

export const metadata = {
  title: "Prezzi",
  description:
    "Chi mette il volto non paga mai. Chi genera paga solo l'uso commerciale, e la persona reale riceve l'80% di ogni generazione.",
};

// Pagina /prezzi: modello COST-PLUS (deciso 2026-06-29). Il prezzo parte dal
// costo reale del motore (gpt-image-2) + un piccolo ricarico equo, diviso tra
// noi e la persona. I numeri sono LIVE da lib/wallet (splitEcho), fonte unica:
// se cambiano le tariffe, la pagina cambia da sola. Le modalità (risoluzione/
// qualità) corrispondono a quelle generabili nello Studio.
const MODES = [
  { label: "Standard", detail: "1024 px, qualità media", size: "1024x1024", quality: "medium" },
  { label: "Alta", detail: "1024 px, alta qualità", size: "1024x1024", quality: "high" },
  { label: "2K", detail: "2048 px", size: "2048x2048", quality: "high" },
  { label: "4K", detail: "fino a 3840 px", size: "3840x2160", quality: "high" },
] as const;

export default function PrezziPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        {/* Hero — il principio, grande */}
        <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
          <span className="label-mono text-teal">Prezzi</span>
          <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            <KineticText text="Chi mette il volto" />{" "}
            <KineticText text="non paga mai" gradient delay={0.3} />
            <KineticText text="." delay={0.45} />
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Il valore qui dentro sono le persone. Per questo entrare nel registro è gratis, per sempre.
            Paga solo chi genera contenuti commerciali, a un prezzo onesto, e una parte va sempre
            alla persona reale.
          </p>
        </section>

        {/* Le due parti: chi mette il volto / chi genera */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Sellers — gratis sempre */}
              <div className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#7FAE96,transparent)]" />
                <span className="label-mono text-teal">Metti il tuo volto</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">€0</span>
                  <span className="text-sm font-semibold text-muted">per sempre</span>
                </div>
                <p className="mt-2 text-sm font-bold text-teal">Sei tu il valore. Non il cliente.</p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Verifica dell'identità a carico nostro",
                    "Avatar creato e mantenuto da noi",
                    "Royalty su ogni utilizzo del tuo volto, senza muovere un dito",
                    "Wallet, storico utilizzi e payout a soglia",
                    "Consenso revocabile in ogni momento, il sistema obbedisce",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/signup">Entra nel registro</Link>
                  </Button>
                </div>
              </div>

              {/* Buyers — a consumo */}
              <div className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#F2A93B,transparent)]" />
                <span className="label-mono text-violet-light">Generi contenuti</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">a consumo</span>
                </div>
                <p className="mt-2 text-sm font-bold text-violet-light">Paghi solo quello che generi.</p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Volti reali, verificati e consenzienti",
                    "Licenza d'uso commerciale, full-res",
                    "Certificato verificabile + filigrana invisibile su ogni output",
                    "Prezzo per categoria d'uso (qui sotto)",
                    "La persona dietro il volto viene pagata, sempre",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-light" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link href="/match">Trova un volto</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Quanto costa generare */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <div className="text-center">
              <span className="label-mono text-crimson-light">Quanto costa generare</span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Paghi quanto costa, più un piccolo ricarico equo.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                Il prezzo parte dal costo reale del motore. Sopra, un ricarico onesto: una parte a noi,
                una parte sempre alla persona. Più la risoluzione è alta più costa, mai oltre 2 €.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODES.map((m) => {
                const s = splitEcho(null, m.size, m.quality);
                return (
                  <div key={m.label} className="glass glass-hover rounded-2xl p-6">
                    <p className="label-mono text-muted">{m.label}</p>
                    <div className="mt-2 text-3xl font-extrabold">{formatEur(s.gross_cents)}</div>
                    <p className="mt-1 text-xs text-faint">{m.detail}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-bold text-teal">Alla persona</span>
                      <span className="text-sm font-extrabold text-teal">{formatEur(s.net_cents)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mx-auto mt-6 max-w-2xl text-center">
              <p className="text-xs leading-relaxed text-faint">
                Il prezzo è mostrato in chiaro prima di generare. Si paga con crediti prepagati, una
                sola ricarica per tante generazioni: nessun abbonamento obbligatorio.
              </p>
            </div>
          </section>
        </Reveal>

        {/* Studio / Enterprise — parliamone */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 pb-24 pt-4 sm:px-8">
            <div className="flex flex-col gap-3">
              {[
                {
                  href: "/studio",
                  label: "SEMBLIC Studio",
                  d: "La campagna la facciamo noi, con volti consenzienti: brief, produzione, consegna.",
                },
                {
                  href: "/enterprise",
                  label: "Enterprise",
                  d: "Roster riservato, licenze prioritarie di categoria, accesso API e supporto dedicato.",
                },
              ].map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex items-center gap-4 rounded-full border border-border bg-white/[0.02] py-4 pl-6 pr-5 transition-all hover:border-violet/40 hover:bg-violet/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{r.label} <span className="ml-1.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">su misura</span></p>
                    <p className="mt-0.5 truncate text-xs text-faint sm:text-sm">{r.d}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:border-violet/50 group-hover:bg-violet/20">
                    <ArrowRight className="h-4 w-4 text-muted transition-colors group-hover:text-foreground" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-faint">
              Parliamone: raccontaci cosa ti serve, rispondiamo con una proposta.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
