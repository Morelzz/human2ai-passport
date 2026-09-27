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
import { fotoPagina } from "@/lib/foto-pagine";
import { Copertina } from "@/components/marketing/pagine/Copertina";

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
// Lo scatto piu' economico e il piu' caro del listino, dalla stessa funzione.
const TUTTI = TABELLA.flatMap((t) => t.livelli);
const MINIMO = Math.min(...TUTTI.map((l) => l.volt));
const MASSIMO = Math.max(...TUTTI.map((l) => l.volt));

export default async function PrezziPage() {
  const copertina = await fotoPagina("prezzi");
  const chi = copertina?.persone.map((p) => p.alias).join(" e ");
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        <Copertina
          copertina={copertina}
          taglio="lato"
          occhiello="Prezzi, dal costo reale del motore"
          titolo="Chi mette il volto non paga mai."
          sotto={
            copertina ? (
              <>Questo scatto è costato <strong className="font-semibold text-white">{eur(copertina.grossCents)}</strong>: <strong className="font-semibold text-[#7FD9A8]">{eur(copertina.royaltyCents)}</strong> sono andati a {chi}. Qui sotto il listino vero, lo stesso che fa pagare Crea.</>
            ) : (
              <>Entrare nel registro è gratis, per sempre. Paga solo chi genera, a un prezzo onesto, e una parte va sempre alla persona reale.</>
            )
          }
          azioni={
            <>
              <Button asChild size="lg"><Link href="#listino">Vedi il listino</Link></Button>
              <Link href="/entra" className="inline-flex h-12 items-center rounded-full border border-white/25 px-5 text-[0.95rem] font-semibold text-[#F4EEE3] transition-colors hover:border-[#E29A2E]">Metti il tuo volto, gratis</Link>
            </>
          }
        />

        {/* Le due parti: chi mette il volto / chi genera */}
        <Reveal>
          <section className="mx-auto max-w-[1380px] px-5 pb-6 pt-14 sm:px-8 sm:pt-20">
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Sellers: gratis sempre */}
              <div className="relative overflow-hidden rounded-[28px] bg-[var(--pannello-persona)] p-7 sm:p-10">
                <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-verified">Metti il tuo volto</span>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-[5.5rem] font-bold leading-[0.85] tracking-[-0.06em] sm:text-[7.5rem]">0 €</span>
                  <span className="text-[1rem] font-semibold text-muted">per sempre</span>
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
              <div data-theme="dark" className="relative overflow-hidden rounded-[28px] bg-[#0E0C09] p-7 text-[#F4EEE3] sm:p-10">
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_90%_10%,rgba(226,154,46,0.18),transparent_70%)]" />
                <span className="relative font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#E29A2E]">Generi contenuti</span>
                <div className="relative mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[1rem] font-semibold text-white/60">da</span>
                  <span className="text-[5.5rem] font-bold leading-[0.85] tracking-[-0.06em] sm:text-[7.5rem]">{eur(MINIMO)}</span>
                  <span className="text-[1rem] font-semibold text-white/60">a scatto, mai oltre {eur(MASSIMO)}</span>
                </div>
                <p className="relative mt-2 text-sm font-bold text-[#E5B57A]">Paghi solo quello che generi.</p>
                <ul className="relative mt-6 flex flex-col gap-3">
                  {[
                    "Volti reali, verificati e consenzienti",
                    "Licenza d'uso commerciale, full-res",
                    "Certificato verificabile + filigrana invisibile su ogni output",
                    "Prezzo in chiaro prima di generare (qui sotto)",
                    "La persona dietro il volto viene pagata, sempre",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug text-white/70">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E5B57A]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-8">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/match">Crea con un volto vero</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Quanto costa generare: foto, scene di gruppo, video */}
        <Reveal>
          <section id="listino" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20">
            <div>
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-amber-ink">Il listino</span>
              <h2 className="mt-3 max-w-[20ch] text-balance text-[2.2rem] font-bold leading-[0.98] tracking-[-0.045em] sm:text-[3.4rem]">
                Quanto costa il motore, più un ricarico equo.
              </h2>
              <p className="mt-4 max-w-[60ch] text-pretty text-[1rem] leading-relaxed text-muted sm:text-[1.1rem]">
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
                  Una scena sola con le foto verificate di ognuno, poi la misura volto per volto: chi non viene riconosciuto si rifa’ da solo.
                  Vale come due scatti, che siate in due o in quattro. La parte delle persone si divide in parti uguali. Esempi in Alta, verticale:
                </p>
                <ul className="mt-4 flex flex-col divide-y divide-border">
                  {GRUPPI.map((g) => (
                    <li key={g.n} className="flex items-baseline justify-between gap-3 py-2.5 tabular-nums">
                      <span className="text-sm font-semibold">{g.n} persone <span className="font-normal text-faint">· come {scattiPerGruppo(g.n)} scatti</span></span>
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
