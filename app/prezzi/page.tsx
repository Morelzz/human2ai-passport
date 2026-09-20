import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { formatEur } from "@/lib/wallet";
import { FORMATI, qualitaPer } from "@/app/match/crea/opzioni";
import { prezzoGruppo, scattiPerGruppo, MAX_PERSONE_GRUPPO } from "@/lib/gruppo-prezzi";
import { LIVELLI, DURATE, prezzoAnima } from "@/lib/engines/anima-prezzi";
import { PIANI, contiPiano } from "@/lib/abbonamenti";
import { SectionTitle } from "@/components/marketing/SectionTitle";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";

export const metadata = {
  title: "Prezzi, dal costo reale del motore",
  description:
    "Chi mette il volto non paga mai. Chi genera paga il costo reale del motore più un piccolo ricarico equo, diviso con la persona reale.",
};

// Pagina /prezzi: modello COST-PLUS (deciso 2026-06-29). Il prezzo parte dal
// costo reale del motore + un piccolo ricarico equo, diviso tra noi e la
// persona. Fonte UNICA con la pagina Crea (19/9/2026): foto da qualitaPer
// (formati e qualita' di Crea), scene di gruppo da lib/gruppo-prezzi, video da
// lib/engines/anima-prezzi. Se cambia una tariffa, cambia qui da sola.
const QUALITA = ["bozza", "alta", "massima"] as const;
const TABELLA = FORMATI.map((f) => ({ formato: f, livelli: qualitaPer(f.v) }));
const ALTA_VERTICALE = qualitaPer("verticale").find((q) => q.v === "alta")!;
const GRUPPI = Array.from({ length: MAX_PERSONE_GRUPPO - 1 }, (_, i) => i + 2).map((n) => ({
  n,
  prezzo: prezzoGruppo({ gross_cents: ALTA_VERTICALE.volt, fee_cents: ALTA_VERTICALE.volt - ALTA_VERTICALE.royaltyCents, net_cents: ALTA_VERTICALE.royaltyCents, surcharge_cents: 0 }, n),
}));
const VIDEO = (["rapido", "standard", "cinema"] as const).map((l) => ({ livello: LIVELLI[l], durate: DURATE.map((d) => ({ d, p: prezzoAnima(l, d) })) }));
const eur = (c: number) => formatEur(c);

export default function PrezziPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        {/* Hero: il principio, grande */}
        <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
          <span className="kicker">Prezzi</span>
          <h1 className="mt-4 text-balance text-[2.6rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
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
              {/* Sellers: gratis sempre */}
              <div className="card relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,var(--verified-c),transparent)]" />
                <span className="kicker text-verified">Metti il tuo volto</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-[-0.04em]">0 €</span>
                  <span className="text-sm font-semibold text-muted">per sempre</span>
                </div>
                <p className="mt-2 text-sm font-bold text-verified">Sei tu il valore. Non il cliente.</p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Verifica dell'identità a carico nostro",
                    "Avatar creato e mantenuto da noi",
                    "Royalty su ogni utilizzo del tuo volto, senza muovere un dito",
                    "Wallet, storico utilizzi e payout a soglia",
                    "Consenso revocabile in ogni momento, il sistema obbedisce",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
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

              {/* Buyers: a consumo */}
              <div className="card relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,var(--amber-c),transparent)]" />
                <span className="kicker">Generi contenuti</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-[-0.04em]">a consumo</span>
                </div>
                <p className="mt-2 text-sm font-bold text-amber-ink">Paghi solo quello che generi.</p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Volti reali, verificati e consenzienti",
                    "Licenza d'uso commerciale, full-res",
                    "Certificato verificabile + filigrana invisibile su ogni output",
                    "Prezzo in chiaro prima di generare (qui sotto)",
                    "La persona dietro il volto viene pagata, sempre",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />
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

        {/* Quanto costa generare: foto, scene di gruppo, video */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <div className="text-center">
              <span className="kicker">Quanto costa generare</span>
              <h2 className="mt-2 text-balance text-[1.7rem] font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
                Paghi quanto costa, più un piccolo ricarico equo.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
                Il prezzo parte dal costo reale del motore. Sopra, un ricarico onesto: una parte a noi,
                una parte sempre alla persona. Gli stessi numeri che vedi in Crea prima di premere Genera.
              </p>
            </div>

            {/* Foto: formato x qualita' */}
            <div className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[1.15rem] font-bold tracking-[-0.02em]">Una foto</h3>
                <span className="text-xs text-faint">Una foto non supera mai 2 €. In verde la parte alla persona.</span>
              </div>
              <div className="card mt-3 overflow-hidden rounded-2xl">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[0.78rem] text-muted">
                      <th className="px-3 py-3 font-semibold sm:px-5">Qualità</th>
                      {TABELLA.map((t) => (
                        <th key={t.formato.v} className="px-2 py-3 font-semibold sm:px-5">{t.formato.l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {QUALITA.map((q, i) => (
                      <tr key={q} className={i < QUALITA.length - 1 ? "border-b border-border" : ""}>
                        <td className="px-3 py-3 align-top sm:px-5">
                          <span className="block font-semibold">{q === "massima" ? "Stampa" : TABELLA[0].livelli[i].l}</span>
                          <span className="block text-xs text-faint">{TABELLA[0].livelli[i].desc}</span>
                        </td>
                        {TABELLA.map((t) => {
                          const l = t.livelli[i];
                          return (
                            <td key={t.formato.v} className="px-2 py-3 align-top tabular-nums sm:px-5">
                              <span className="block font-bold">{eur(l.volt)}</span>
                              <span className="block text-xs font-semibold text-verified">{eur(l.royaltyCents)}</span>
                              <span className="hidden text-[0.7rem] text-faint sm:block">{l.size.replace("x", "×")}{q === "massima" ? ` · ${l.l.replace("Stampa ", "")}` : ""}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {/* Scene di gruppo */}
              <div className="card rounded-2xl p-5 sm:p-6">
                <h3 className="text-[1.15rem] font-bold tracking-[-0.02em]">Scena di gruppo</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Prima la scena, poi ogni volto rifatto con le foto verificate della sua persona: con N persone il motore lavora N+1 volte.
                  La parte delle persone si divide in parti uguali. Esempi in Alta, verticale:
                </p>
                <ul className="mt-4 flex flex-col divide-y divide-border">
                  {GRUPPI.map((g) => (
                    <li key={g.n} className="flex items-baseline justify-between gap-3 py-2.5 tabular-nums">
                      <span className="text-sm font-semibold">{g.n} persone <span className="font-normal text-faint">· {scattiPerGruppo(g.n)} passaggi</span></span>
                      <span className="text-right text-sm">
                        <span className="font-bold">{eur(g.prezzo.gross_cents)}</span>
                        <span className="ml-2 text-xs font-semibold text-verified">{eur(g.prezzo.quote[g.n - 1])} a testa</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-faint">In primo piano al massimo {MAX_PERSONE_GRUPPO} persone vere: il resto della gente resta sullo sfondo, non riconoscibile.</p>
              </div>

              {/* Anima: video */}
              <div className="card rounded-2xl p-5 sm:p-6">
                <h3 className="text-[1.15rem] font-bold tracking-[-0.02em]">Anima, lo scatto diventa video</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Da uno scatto certificato, con il sì al video della persona. Mai audio. Ogni video è controllato fotogramma per fotogramma prima di arrivarti.
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <table className="w-full border-collapse text-left text-sm tabular-nums">
                    <thead>
                      <tr className="border-b border-border text-[0.78rem] text-muted">
                        <th className="px-3 py-2.5 font-semibold">Livello</th>
                        {DURATE.map((d) => <th key={d} className="px-3 py-2.5 font-semibold">{d} secondi</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {VIDEO.map((v, i) => (
                        <tr key={v.livello.v} className={i < VIDEO.length - 1 ? "border-b border-border" : ""}>
                          <td className="px-3 py-2.5 align-top">
                            <span className="block font-semibold">{v.livello.l}</span>
                            <span className="block text-xs text-faint">{v.livello.desc}</span>
                          </td>
                          {v.durate.map((x) => (
                            <td key={x.d} className="px-3 py-2.5 align-top">
                              <span className="block font-bold">{eur(x.p.gross_cents)}</span>
                              <span className="block text-xs font-semibold text-verified">{eur(x.p.royalty_cents)}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-2xl text-center">
              <p className="text-xs leading-relaxed text-faint">
                Il prezzo è mostrato in chiaro prima di generare. Si paga con crediti prepagati (1 ⚡ = 1 centesimo), una
                sola ricarica per tante generazioni: nessun abbonamento obbligatorio. Se qualcosa va storto, i crediti tornano da soli.
              </p>
            </div>
          </section>
        </Reveal>


        {/* Il volto a noleggio */}
        <Reveal>
          <section id="abbonamenti" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-10 sm:px-8">
            <SectionTitle kicker="Il volto a noleggio" subtitle="Una persona del registro diventa il volto del tuo brand per un periodo: contenuti ogni mese, sempre lo stesso viso, con il consenso e il certificato di ogni file. La persona riceve la sua parte ogni mese.">
              Quando un volto non ti serve una volta sola.
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {PIANI.map((p) => {
                const c = contiPiano(p);
                return (
                  <div key={p.id} className="card flex flex-col gap-3 p-6 sm:p-7">
                    <span className="kicker">{p.nome}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[2.2rem] font-bold leading-none tracking-[-0.04em]">{formatEur(p.prezzoCents)}</span>
                      <span className="text-[0.9rem] text-muted">al mese</span>
                    </div>
                    <p className="text-[0.95rem] leading-relaxed text-foreground">
                      {p.foto} foto in alta e {p.video === 1 ? "un video" : `${p.video} video`} da 5 secondi ogni mese, con lo stesso volto.
                    </p>
                    <p className="text-[0.88rem] leading-relaxed text-muted">{p.per}</p>
                    <span className="mt-auto rounded-xl bg-verified-soft px-3 py-2 text-[0.85rem] font-semibold text-on-verified">
                      {formatEur(c.personaCents)} al mese alla persona
                    </span>
                    <Link
                      href={`/contatti?oggetto=brand&piano=${p.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-edge bg-surface text-[0.92rem] font-semibold transition-colors hover:border-amber/70"
                    >
                      Richiedi {p.nome}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[0.88rem] leading-relaxed text-faint">
              I piani si attivano parlando con noi: scegliamo insieme la persona, la disponibilità e l&apos;esclusiva.
              Ogni contenuto resta certificato e verificabile come quelli a consumo.
            </p>
          </section>
        </Reveal>

        {/* Studio / Enterprise: parliamone */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 pb-8 pt-4 sm:px-8">
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
                  className="group flex items-center gap-4 rounded-3xl border border-border bg-surface py-4 pl-5 pr-4 transition-all hover:border-amber/60 hover:bg-amber-soft sm:pl-6 sm:pr-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{r.label} <span className="ml-1.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">su misura</span></p>
                    <p className="mt-0.5 text-xs leading-snug text-faint sm:text-sm">{r.d}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:border-amber/60 group-hover:bg-amber-soft">
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
        <Footer />
      </div>
    </div>
  );
}
