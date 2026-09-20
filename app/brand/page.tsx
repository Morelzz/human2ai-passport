import Link from "next/link";
import { Check } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { SectionTitle } from "@/components/marketing/SectionTitle";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { IlSetVideo } from "@/components/marketing/IlSetVideo";
import { qualitaPer } from "@/app/match/crea/opzioni";
import { PIANI, contiPiano } from "@/lib/abbonamenti";
import { prezzoGruppo } from "@/lib/gruppo-prezzi";
import { prezzoAnima } from "@/lib/engines/anima-prezzi";
import { formatEur } from "@/lib/wallet";

// PAGINA PER I BRAND (20/9/2026): una promessa sola, per chi compra contenuti.
// La home racconta il registro e il perche'; qui si vende il risultato: volti
// veri, liberatoria inclusa, contenuti pronti oggi. Collegata dal menu Genera,
// dal footer e dalla mappa del sito.
export const metadata = {
  title: "Volti veri per le tue campagne",
  description:
    "Scegli una persona vera del registro, scrivi la scena, ricevi foto e video pronti. Consenso verificato, liberatoria inclusa, certificato su ogni contenuto.",
};

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;

const PASSI = [
  { n: "01", t: "Scegli il volto", d: "Dal registro, oppure lo sceglie Semblic leggendo la tua scena. Ogni persona è verificata e ha detto sì all'uso commerciale." },
  { n: "02", t: "Scrivi la scena", d: "Una frase: cosa succede nella foto. Luce, formato e inquadratura li imposta il set, e li cambi con un tocco." },
  { n: "03", t: "Scarica e usa", d: "Foto in alta risoluzione, scene con più persone, video di 5 o 10 secondi. Ogni contenuto esce con il suo certificato." },
];

const PROVE = [
  { t: "Consenso verificato", d: "Persone reali, identità verificata, sì all'uso commerciale revocabile." },
  { t: "Somiglianza misurata", d: "Ogni scatto confrontato con le foto vere della persona: il numero è sul risultato." },
  { t: "Certificato e filigrana", d: "Chiunque può verificare un contenuto su Sigil, anche i tuoi clienti." },
  { t: "Pronto per l'AI Act", d: "Contenuti sintetici dichiarati e tracciabili, con la ricevuta di conformità del consenso." },
];

export default function BrandPage() {
  const alta = qualitaPer("verticale").find((q) => q.v === "alta")!;
  const gruppo2 = prezzoGruppo({ gross_cents: alta.volt, fee_cents: alta.volt - alta.royaltyCents, net_cents: alta.royaltyCents, surcharge_cents: 0 }, 2);
  const video = prezzoAnima("standard", 5);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <SiteNav />

        {/* Promessa */}
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-10 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="kicker">Per i brand e le agenzie</span>
            <h1 className="mt-4 text-balance text-[2.5rem] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[3.6rem]">
              <KineticText text="Volti veri per le tue campagne." />{" "}
              <KineticText text="Con la liberatoria inclusa." gradient delay={0.3} />
            </h1>
            <p className="mt-5 max-w-[56ch] text-pretty text-[1.05rem] leading-relaxed text-muted">
              Niente casting, niente shooting da organizzare, niente immagini rubate. Scegli una persona reale del
              registro, scrivi cosa succede nella foto e scarica il contenuto: la persona ha dato il consenso, viene
              pagata a ogni utilizzo, e ogni file esce con il certificato che lo dimostra.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/match" className="inline-flex h-[52px] items-center rounded-full bg-amber px-6 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
                Prova il set
              </Link>
              <Link href="/contatti?oggetto=brand" className="inline-flex h-[52px] items-center rounded-full border border-edge bg-surface px-6 text-[1rem] font-semibold transition-colors hover:border-amber/70">
                Parla con noi
              </Link>
              <span className="text-[0.9rem] text-faint">Prima prova senza impegno</span>
            </div>
          </div>

          <div data-theme="dark" className="isola grid grid-cols-2 gap-2 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/il-set-gruppo.jpg`} alt="Due persone del registro in una stessa foto, al tavolino di un bar" width={896} height={1120} className="h-full w-full rounded-[20px] object-cover" />
            <div className="flex flex-col gap-2">
              <IlSetVideo src={`${BASE}/il-set-anima.mp4`} poster={`${BASE}/il-set-anima-poster.jpg`} className="h-1/2 w-full rounded-[20px] object-cover" />
              <div className="flex h-1/2 flex-col justify-center gap-1 rounded-[20px] bg-surface p-4">
                <span className="kicker text-verified">Somiglianza</span>
                <span className="text-[2.4rem] font-bold leading-none tracking-[-0.04em]">84%</span>
                <span className="text-[0.82rem] leading-snug text-muted">misurata con le foto verificate della persona</span>
              </div>
            </div>
          </div>
        </section>

        {/* Perché è diverso da un generatore qualsiasi */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <div className="riga-scorrevole -mx-5 scroll-px-5 px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:px-0 lg:grid-cols-4">
              {PROVE.map((p) => (
                <div key={p.t} className="card flex w-[78vw] shrink-0 flex-col gap-2 p-5 sm:w-auto">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-verified-soft">
                    <Check className="h-4 w-4 text-verified" />
                  </span>
                  <span className="text-[1rem] font-bold tracking-[-0.01em]">{p.t}</span>
                  <span className="text-[0.9rem] leading-relaxed text-muted">{p.d}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Come si fa */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <SectionTitle kicker="In tre passi">Dalla frase al contenuto, oggi.</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {PASSI.map((s) => (
                <div key={s.n} className="card flex flex-col gap-3 p-6 sm:p-7">
                  <span className="kicker self-start rounded-full bg-amber-soft px-2.5 py-1.5 text-[0.62rem]">{s.n}</span>
                  <h3 className="text-[1.25rem] font-bold leading-tight tracking-[-0.02em]">{s.t}</h3>
                  <p className="text-[0.95rem] leading-relaxed text-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Quanto costa, in chiaro */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <SectionTitle kicker="Prezzi in chiaro" subtitle="Paghi il costo reale del motore più un ricarico onesto, e una parte va sempre alla persona. Nessun abbonamento obbligatorio.">
              Quanto costa un contenuto.
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { t: "Una foto", p: formatEur(alta.volt), d: "Alta qualità, verticale. Altri formati e la stampa nella pagina prezzi." },
                { t: "Scena con due persone", p: formatEur(gruppo2.gross_cents), d: "Ogni volto rifatto con le foto verificate della sua persona, e misurato." },
                { t: "Video di 5 secondi", p: formatEur(video.gross_cents), d: "Dallo scatto certificato, senza audio, controllato fotogramma per fotogramma." },
              ].map((x) => (
                <div key={x.t} className="card flex flex-col gap-1.5 p-6">
                  <span className="text-[0.85rem] font-semibold text-muted">{x.t}</span>
                  <span className="text-[2rem] font-bold tracking-[-0.04em]">{x.p}</span>
                  <span className="text-[0.88rem] leading-relaxed text-muted">{x.d}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.9rem] text-muted">
              Campagne continuative, volto in esclusiva per un periodo, produzione affidata a noi:{" "}
              <Link href="/contatti?oggetto=brand" className="font-semibold text-amber-ink hover:underline">ne parliamo</Link>.
            </p>
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

        {/* La parte legale, detta semplice */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <div data-theme="dark" className="isola grid gap-6 p-7 sm:p-10 lg:grid-cols-2">
              <div>
                <span className="kicker text-amber">La parte che ti protegge</span>
                <h2 className="mt-3 text-balance text-[1.9rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.4rem]">
                  Se un volto è tuo cliente domani, devi poterlo dimostrare oggi.
                </h2>
                <p className="mt-4 text-[1rem] leading-relaxed text-muted">
                  Ogni contenuto nasce da una persona reale che ha firmato il consenso, e porta con sé la prova:
                  certificato verificabile, ricevuta di conformità da allegare a un contratto, filigrana invisibile
                  nelle foto e certificato dentro il file dei video.
                </p>
              </div>
              <ul className="flex flex-col gap-3 self-center">
                {[
                  "Ricevuta di conformità del consenso, scaricabile per ogni contenuto",
                  "Verifica pubblica su Sigil: la può fare anche il tuo cliente",
                  "La persona può revocare: vale per il futuro, non per quello che hai già fatto",
                  "Nessun volto protetto può comparire: il sistema lo controlla prima di consegnare",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[0.95rem] leading-snug text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>

        {/* Chiusura */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8">
            <h2 className="text-balance text-[2rem] font-bold leading-tight tracking-[-0.035em] sm:text-[2.8rem]">
              Fai la prima foto adesso.
            </h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-pretty text-[1rem] leading-relaxed text-muted">
              Scegli un volto, scrivi una frase, guarda il risultato. Se ti serve una campagna intera, la produciamo noi.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/match" className="inline-flex h-[52px] items-center rounded-full bg-amber px-6 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
                Prova il set
              </Link>
              <Link href="/contatti?oggetto=brand" className="inline-flex h-[52px] items-center rounded-full border border-edge bg-surface px-6 text-[1rem] font-semibold transition-colors hover:border-amber/70">
                Parla con noi
              </Link>
            </div>
          </section>
        </Reveal>

        <Footer />
      </div>
    </div>
  );
}
