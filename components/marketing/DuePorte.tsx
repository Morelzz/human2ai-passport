import Link from "next/link";
import { Database, ShieldCheck, UserRound } from "lucide-react";
import type { ScattoVetrina } from "@/lib/vetrina";
import { ContaEuro } from "@/components/motion/ContaEuro";

// ──────────────────────────────────────────────────────────────────────────
// LE DUE PORTE (27/9/2026, proposta 3 approvata da Morelz). La prima pagina
// mostra una foto sola vista da due parti: a sinistra quello che ottiene chi
// la crea (lo scatto certificato e il suo prezzo), a destra quello che ottiene
// chi ci ha messo la faccia (quanto ha preso, e che decide lei). Due porte
// alla pari: i due pubblici contano uguale.
//
// Tutto e' vero: lo scatto, il prezzo e il compenso vengono dal database
// (lib/vetrina). Senza scatto in vetrina (consenso revocato, database fermo)
// restano le due porte, senza foto e senza numeri inventati.
//
// Movimento: uno solo, le due meta' che salgono insieme all'apertura. Solo
// transform: la foto (l'elemento piu' grande) si dipinge subito.
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const NOME_QUALITA: Record<ScattoVetrina["qualita"], string> = { bozza: "bozza veloce", alta: "alta qualità", stampa: "stampa 4K" };

export function DuePorte({ vetrina }: { vetrina: ScattoVetrina | null }) {
  return (
    <section aria-labelledby="titolo-porte" className="mx-auto max-w-[1380px] px-4 pb-16 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
      <div className="mx-auto max-w-4xl text-center">
        <h2 id="titolo-porte" className="text-balance text-[2.3rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[3.2rem] lg:text-[4rem]">
          Una foto, due persone contente.
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-pretty text-[1.1rem] leading-relaxed text-muted sm:text-[1.3rem]">
          Lo stesso scatto visto dalle due parti: quello che paga chi lo crea, quello che riceve chi ci mette la faccia.
        </p>
      </div>

      {/* Sotto il computer le due meta' si scorrono di lato (regola del telefono:
          niente colonne infinite): la seconda porta spunta a destra. */}
      <div className="porte-home mt-10 grid gap-4 max-lg:-mx-4 max-lg:snap-x max-lg:snap-mandatory max-lg:auto-cols-[86%] max-lg:grid-flow-col max-lg:overflow-x-auto max-lg:scroll-px-4 max-lg:items-start max-lg:px-4 max-lg:pb-2 sm:mt-12 sm:max-lg:auto-cols-[62%] lg:grid-cols-2 lg:gap-5">
        {/* Chi crea */}
        <article className="porta-home flex snap-start flex-col rounded-[20px] border border-border bg-surface p-5 sm:p-7">
          {vetrina ? (
            <>
              <div className="relative overflow-hidden rounded-[14px] bg-[var(--hairline-soft)]">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/home/scatto-gabriella-760.webp 760w, /home/scatto-gabriella-1200.webp 1200w"
                    sizes="(min-width: 1024px) 38vw, 92vw"
                  />
                  <img
                    src="/home/scatto-gabriella.jpg"
                    alt={`${vetrina.nome} legge un libro al tavolino di un caffè in piazza: scatto certificato Semblic`}
                    width={1536}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/2] h-auto w-full object-cover"
                  />
                </picture>
                <Link
                  href={`/verify?token=${encodeURIComponent(vetrina.certificato)}`}
                  className="absolute left-3 top-3 inline-flex min-h-[40px] items-center rounded-full bg-white/95 px-4 text-[0.9rem] font-semibold text-[#17150F] shadow-[0_2px_10px_rgba(23,21,15,0.12)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  Certificato SEMBLIC
                </Link>
              </div>
              <p className="mt-5 text-[1.05rem] text-muted">
                Scatto {vetrina.formato}, {NOME_QUALITA[vetrina.qualita]}
              </p>
              <p className="mt-1 text-[2.9rem] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[3.4rem]">
                <ContaEuro cent={vetrina.prezzoCent} />
              </p>
            </>
          ) : (
            <p className="text-[1.15rem] leading-relaxed text-muted">
              Scegli un volto dal registro, scrivi la scena, paghi solo lo scatto.
            </p>
          )}
          <div aria-hidden className="hidden flex-1 lg:block" />
          <Link
            href="/match"
            className="mt-6 inline-flex min-h-[56px] w-full items-center justify-center rounded-full bg-amber px-6 text-[1.1rem] font-semibold text-on-amber transition-[background-color,transform] duration-200 hover:bg-amber-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-amber"
          >
            Crea con volti veri
          </Link>
        </article>

        {/* Chi ci mette la faccia */}
        <article className="porta-home flex snap-start flex-col rounded-[20px] bg-[var(--pannello-persona)] p-5 sm:p-7">
          {vetrina && (
            <div className="flex items-center gap-4 sm:gap-5">
              <picture className="shrink-0">
                <source type="image/webp" srcSet="/home/ritratto-gabriella-240.webp 240w, /home/ritratto-gabriella-400.webp 400w" sizes="160px" />
                <img
                  src="/home/ritratto-gabriella.jpg"
                  alt={`Ritratto di ${vetrina.nome} dal registro`}
                  width={720}
                  height={850}
                  loading="lazy"
                  decoding="async"
                  className="h-[124px] w-[104px] rounded-[14px] object-cover sm:h-[190px] sm:w-[161px]"
                />
              </picture>
              <div>
                <Link href={`/passport/${vetrina.handle}`} className="block text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] underline-offset-4 hover:underline">
                  {vetrina.nome}
                </Link>
                <p className="mt-2 inline-flex min-h-[36px] items-center gap-2 whitespace-nowrap rounded-full bg-[var(--consenso-pill)] px-3.5 text-[1.05rem] font-medium text-[var(--on-consenso-pill)]">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#2E9E44]" />
                  consenso attivo
                </p>
              </div>
            </div>
          )}
          <ul className="mt-6 grid gap-5 text-[1.08rem] sm:mt-10 sm:gap-6 sm:text-[1.3rem] lg:mt-14 lg:gap-9">
            <li className="flex items-center gap-4">
              <Database aria-hidden className="h-7 w-7 shrink-0" strokeWidth={1.6} />
              <span>
                {vetrina ? <><b className="font-semibold">Ha ricevuto</b> <ContaEuro cent={vetrina.allaPersonaCent} durata={1400} /> per questo scatto</> : <><b className="font-semibold">Guadagni</b> a ogni foto che fanno con il tuo volto</>}
              </span>
            </li>
            <li className="flex items-center gap-4">
              <ShieldCheck aria-hidden className="h-7 w-7 shrink-0" strokeWidth={1.6} />
              <span>{vetrina ? <><b className="font-semibold">Revoca</b> quando vuole, vale subito</> : <><b className="font-semibold">Revochi</b> quando vuoi, vale subito</>}</span>
            </li>
            <li className="flex items-center gap-4">
              <UserRound aria-hidden className="h-7 w-7 shrink-0" strokeWidth={1.6} />
              <span>{vetrina ? <><b className="font-semibold">Decide lei</b> a cosa dice no, con parole sue</> : <><b className="font-semibold">Decidi tu</b> a cosa dici no, con parole tue</>}</span>
            </li>
          </ul>
          <div aria-hidden className="hidden flex-1 lg:block" />
          <Link
            href="/entra"
            className="mt-8 inline-flex min-h-[56px] w-full items-center justify-center rounded-full bg-foreground px-6 text-[1.1rem] font-semibold text-background transition-transform duration-200 hover:-translate-y-px active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-amber"
          >
            Metti il tuo volto
          </Link>
        </article>
      </div>
    </section>
  );
}
