import Link from "next/link";
import { Check } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { SectionTitle } from "@/components/marketing/SectionTitle";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { qualitaPer } from "@/app/match/crea/opzioni";
import { prezzoAnima } from "@/lib/engines/anima-prezzi";
import { PIANI, contiPiano } from "@/lib/abbonamenti";
import { formatEur } from "@/lib/wallet";
import { createServerClient } from "@/lib/supabase";
import { getPublicAvatars } from "@/lib/registry";

// PAGINA PER CHI METTE IL VOLTO (20/9/2026). Prima esisteva solo il flusso
// chiuso /signup/avatar: chi arrivava da fuori trovava un accesso, non una
// ragione. Qui c'e' la ragione, con numeri veri e senza promesse: quanto si
// guadagna, cosa si controlla, cosa non facciamo mai.
export const metadata = {
  title: "Metti il tuo volto nel registro",
  description:
    "Entrare è gratis. Guadagni ogni volta che il tuo volto viene usato, decidi tu per cosa, e revochi quando vuoi. Il consenso è tuo e resta tuo.",
};

const CONTROLLI = [
  { t: "Sì o no all'uso commerciale", d: "Un interruttore nel tuo account. Senza il tuo sì, nessuno può generare niente con il tuo volto." },
  { t: "Il video è un sì a parte", d: "Le foto sono una cosa, i video un'altra: decidi separatamente. La voce non si genera mai." },
  { t: "Revoca quando vuoi", d: "Blocca ogni uso futuro, subito. Quello che è già stato fatto resta, con la data: la storia non si riscrive." },
  { t: "Il tuo passaporto pubblico", d: "Chiunque può vedere cosa hai autorizzato e quando. È la tua prova, non la nostra." },
];

const MAI = [
  "Non vendiamo i tuoi dati e non li usiamo per addestrare modelli.",
  "Le tue foto restano in un archivio cifrato: non sono pubbliche e non si scaricano.",
  "Nessuna voce: Semblic non genera la tua voce, nemmeno nei video.",
  "Se un contenuto assomiglia a una persona che ha chiesto tutela, non esce.",
];

const PASSI = [
  { n: "01", t: "Crea l'account", d: "Una email e basta. Serve solo a legare il consenso a te." },
  { n: "02", t: "Verifica l'identità", d: "Documento e selfie, dal telefono, in pochi minuti. Serve a garantire che sei tu e che sei maggiorenne." },
  { n: "03", t: "Carica le tue foto", d: "Otto scatti del tuo viso: sono quelli che tengono la somiglianza. Controlliamo che il volto sia lo stesso del documento." },
];

export default async function EntraPage() {
  const alta = qualitaPer("verticale").find((q) => q.v === "alta")!;
  const video = prezzoAnima("standard", 5);
  const campagna = PIANI.find((p) => p.id === "campagna")!;
  const contiCampagna = contiPiano(campagna);
  const registro = await getPublicAvatars(createServerClient()).catch(() => []);
  const quanti = registro.filter((a) => !a.revoked_at).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <SiteNav />

        <section className="mx-auto max-w-4xl px-5 pb-8 pt-14 text-center sm:px-8 sm:pt-20">
          <span className="kicker">Metti il tuo volto</span>
          <h1 className="mt-4 text-balance text-[2.5rem] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[3.6rem]">
            <KineticText text="Il tuo volto vale." />{" "}
            <KineticText text="E decidi tu." gradient delay={0.3} />
          </h1>
          <p className="mx-auto mt-5 max-w-[58ch] text-pretty text-[1.05rem] leading-relaxed text-muted">
            L&apos;intelligenza artificiale oggi genera persone che non esistono, o copia quelle che esistono senza
            chiedere. Semblic fa il contrario: mette il tuo volto in un registro dove serve il tuo permesso per ogni
            utilizzo, e ogni utilizzo ti paga. Entrare è gratis, e resti padrone di tutto.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup/avatar" className="inline-flex h-[52px] items-center rounded-full bg-amber px-6 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
              Entra nel registro
            </Link>
            <Link href="/catalogo" className="inline-flex h-[52px] items-center rounded-full border border-edge bg-surface px-6 text-[1rem] font-semibold transition-colors hover:border-amber/70">
              Guarda chi c&apos;è già
            </Link>
          </div>
          {quanti > 0 && (
            <p className="mt-4 text-[0.9rem] text-faint">
              Nel registro ci sono {quanti} volti verificati. Chi entra adesso è tra i primi, e viene scelto più spesso.
            </p>
          )}
        </section>

        {/* Quanto si guadagna, senza giri di parole */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <SectionTitle kicker="Quanto si guadagna" subtitle="Non ti promettiamo cifre: ti diciamo quanto vale ogni utilizzo. Dipende da quante volte il tuo volto viene scelto.">
              I numeri veri, quelli del listino.
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { t: "Ogni foto", v: formatEur(alta.royaltyCents), d: "Per una foto in alta qualità. Tu non paghi mai niente." },
                { t: "Ogni video", v: formatEur(video.royalty_cents), d: "Per un video di 5 secondi, se hai detto sì anche al video." },
                { t: "Volto a noleggio", v: `${formatEur(contiCampagna.personaCents)} al mese`, d: `Se un brand ti prende per un periodo (piano ${campagna.nome}).` },
              ].map((x) => (
                <div key={x.t} className="card flex flex-col gap-1.5 p-6">
                  <span className="text-[0.85rem] font-semibold text-muted">{x.t}</span>
                  <span className="text-[2rem] font-bold tracking-[-0.04em] text-verified">{x.v}</span>
                  <span className="text-[0.88rem] leading-relaxed text-muted">{x.d}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-muted">
              Le royalty si accumulano nel tuo conto e le incassi al raggiungimento della soglia. Ogni utilizzo è
              tracciato: vedi quando, per cosa e quanto, nel tuo account.
            </p>
          </section>
        </Reveal>

        {/* Cosa controlli */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <SectionTitle kicker="Il consenso resta tuo">Quattro interruttori, in mano a te.</SectionTitle>
            <div className="riga-scorrevole -mx-5 scroll-px-5 px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:px-0 lg:grid-cols-4">
              {CONTROLLI.map((c) => (
                <div key={c.t} className="card flex w-[78vw] shrink-0 flex-col gap-2 p-5 sm:w-auto">
                  <span className="text-[1rem] font-bold tracking-[-0.01em]">{c.t}</span>
                  <span className="text-[0.9rem] leading-relaxed text-muted">{c.d}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Cosa non facciamo mai */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <div data-theme="dark" className="isola grid gap-6 p-7 sm:p-10 lg:grid-cols-2">
              <div>
                <span className="kicker text-amber">Quello che non facciamo mai</span>
                <h2 className="mt-3 text-balance text-[1.9rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.4rem]">
                  Le regole valgono anche contro di noi.
                </h2>
                <p className="mt-4 text-[1rem] leading-relaxed text-muted">
                  Un registro dei volti ha senso solo se i limiti sono scritti e verificabili. Questi non sono
                  slogan: sono controlli dentro il sistema, e li raccontiamo nel rapporto di trasparenza.
                </p>
                <Link href="/trasparenza" className="mt-4 inline-flex text-[0.95rem] font-semibold text-amber hover:underline">
                  Vedi il rapporto di trasparenza
                </Link>
              </div>
              <ul className="flex flex-col gap-3 self-center">
                {MAI.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[0.95rem] leading-snug text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>

        {/* Come si entra */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
            <SectionTitle kicker="In tre passi" subtitle="Dieci minuti in tutto, dal telefono. Poi il tuo volto è nel registro e puoi spegnerlo quando vuoi.">
              Come si entra.
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {PASSI.map((s) => (
                <div key={s.n} className="card flex flex-col gap-3 p-6 sm:p-7">
                  <span className="kicker self-start rounded-full bg-amber-soft px-2.5 py-1.5 text-[0.62rem]">{s.n}</span>
                  <h3 className="text-[1.25rem] font-bold leading-tight tracking-[-0.02em]">{s.t}</h3>
                  <p className="text-[0.95rem] leading-relaxed text-muted">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup/avatar" className="inline-flex h-[52px] items-center rounded-full bg-amber px-6 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
                Entra nel registro
              </Link>
              <Link href="/tutela" className="text-[0.95rem] font-semibold text-amber-ink hover:underline">
                Voglio solo proteggere il mio volto, non guadagnarci
              </Link>
            </div>
          </section>
        </Reveal>

        <Footer />
      </div>
    </div>
  );
}
