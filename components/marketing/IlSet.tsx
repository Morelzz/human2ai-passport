import Link from "next/link";
import { SectionTitle } from "@/components/marketing/SectionTitle";

// [IL SET, OGGI] (mockup 19/9/2026, in attesa dell'ok di Morelz prima di
// entrare in home): cosa sa fare Crea adesso, in quattro schede. Una grande
// scena di gruppo, il video che si muove, e due schede di testo per il casting
// e la somiglianza misurata. I media arrivano da fuori (props): nessun volto
// del registro finisce in home senza il suo ok.

export function IlSet({ gruppo, video, poster }: { gruppo: string; video: string; poster: string }) {
  return (
    <section id="il-set" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-20 sm:px-8 sm:pt-24">
      <div className="sv">
        <SectionTitle kicker="Il set, oggi" subtitle="Scrivi cosa succede. Il set sceglie persone vere del registro, le mette in scena, le fa muovere e misura quanto restano se stesse.">
          Una frase. Il resto lo fa il set.
        </SectionTitle>
      </div>

      {/* Sul telefono le quattro schede scorrono di lato (niente colonne infinite) */}
      <div className="riga-scorrevole -mx-5 scroll-px-5 px-5 sm:mx-0 sm:grid sm:gap-4 sm:scroll-px-0 sm:px-0 lg:grid-cols-12">
        {/* Scena di gruppo: la scheda grande */}
        <div data-theme="dark" className="isola sv flex w-[84vw] flex-col sm:w-auto lg:col-span-7">
          <div className="relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:h-[440px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gruppo} alt="Due persone del registro nella stessa foto, al tavolino di un bar" className="h-full w-full object-cover object-[center_30%]" />
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {["Gabriella 82%", "Stella 82%"].map((c) => (
                <span key={c} className="rounded-full bg-[rgba(12,15,23,0.7)] px-3 py-1.5 text-[0.8rem] text-[#F2E9D8]">{c}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 p-6 sm:p-7">
            <span className="kicker text-amber">Scene di gruppo</span>
            <h3 className="text-[1.45rem] font-bold leading-tight tracking-[-0.02em]">Più persone vere, nella stessa foto.</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted">
              Prima la scena, poi ogni volto rifatto con le foto verificate della sua persona, uno alla volta. Ogni volto misurato, ogni persona pagata.
            </p>
          </div>
        </div>

        {/* Anima: il video */}
        <div data-theme="dark" className="isola sv flex w-[84vw] flex-col sm:w-auto lg:col-span-5" style={{ animationRange: "entry 10% entry 50%" }}>
          <div className="relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:h-[440px]">
            <video src={video} poster={poster} autoPlay muted loop playsInline className="h-full w-full object-cover object-[center_20%]" />
            <span className="absolute left-3 top-3 rounded-full bg-amber px-2.5 py-1 text-[0.72rem] font-bold text-on-amber">Anima</span>
          </div>
          <div className="flex flex-col gap-2 p-6 sm:p-7">
            <h3 className="text-[1.45rem] font-bold leading-tight tracking-[-0.02em]">Lo scatto si muove.</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted">
              Cinque o dieci secondi da uno scatto certificato, con il sì al video della persona. Mai audio. Ogni fotogramma controllato.
            </p>
          </div>
        </div>

        {/* Casting */}
        <div className="card sv flex w-[84vw] flex-col gap-3 p-6 sm:w-auto sm:p-7 lg:col-span-7">
          <span className="kicker">Casting automatico</span>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-[var(--bg)] p-3 text-[0.95rem]">
            <span className="rounded-full border border-amber/50 px-3 py-1.5 text-[0.85rem] font-semibold text-amber-ink">Semblic sceglie per te</span>
            <span className="text-foreground">una ragazza bionda che corre in un campo al tramonto</span>
          </div>
          <h3 className="text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">Scrivi la scena, il volto lo trova Semblic.</h3>
          <p className="text-[0.95rem] leading-relaxed text-muted">
            Il set sceglie dal registro una persona vera che corrisponde e ha detto sì, dando la precedenza a chi è stato scelto meno. Oppure la chiami per nome.
          </p>
        </div>

        {/* Somiglianza */}
        <div className="card sv flex w-[84vw] flex-col gap-3 p-6 sm:w-auto sm:p-7 lg:col-span-5" style={{ animationRange: "entry 10% entry 50%" }}>
          <span className="kicker text-verified">Somiglianza misurata</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.2rem] font-bold leading-none tracking-[-0.05em]">93%</span>
            <span className="text-[0.9rem] text-muted">con le foto verificate</span>
          </div>
          <h3 className="text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">Non la promettiamo: la misuriamo.</h3>
          <p className="text-[0.95rem] leading-relaxed text-muted">
            Ogni scatto e ogni video vengono confrontati con le foto vere della persona. Il numero sta sul risultato e sulla ricevuta.
          </p>
        </div>
      </div>

      <div className="sv mt-6 flex flex-wrap items-center gap-3">
        <Link href="/match" className="inline-flex h-12 items-center rounded-full bg-amber px-6 text-[0.98rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
          Prova il set
        </Link>
        <Link href="/prezzi" className="text-[0.95rem] font-semibold text-amber-ink hover:underline">Quanto costa</Link>
      </div>
    </section>
  );
}
