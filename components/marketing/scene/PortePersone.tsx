import Link from "next/link";

// ──────────────────────────────────────────────────────────────────────────
// LE DUE PORTE (1/10/2026). Oggi "Metti il tuo volto" era un bottone secondario:
// qui chi ha un volto ha la stessa importanza di chi crea. L'idea dell'"AI twin"
// che si vede nei video, fatta bene: il gemello digitale lavora con il tuo sì,
// tu decidi cosa non fara' mai, sei pagato a ogni scatto e revochi quando vuoi.
// Tutto quello che c'e' scritto esiste gia' nel prodotto (limiti scritti con
// parole proprie, compenso per scatto, revoca, Ward che cerca le copie).
// ──────────────────────────────────────────────────────────────────────────

const euro = (cent: number) => (cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const Voce = ({ children }: { children: string }) => (
  <li className="flex items-baseline gap-3 text-[0.98rem] leading-snug">
    <i aria-hidden className="h-[7px] w-[7px] shrink-0 -translate-y-[2px] rounded-full bg-amber" />
    {children}
  </li>
);

export function PortePersone({ prezzoDaCent }: { prezzoDaCent: number }) {
  return (
    <section aria-labelledby="titolo-porte" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-24">
      <h2 id="titolo-porte" className="max-w-[20ch] text-balance text-[2.1rem] font-bold leading-[1] tracking-[-0.045em] sm:text-[3.4rem]">Due modi di usare un volto, uno solo di farlo bene.</h2>
      <div className="mt-9 grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-7 sm:p-9">
          <span className="font-mono text-[0.72rem] tracking-[0.06em] text-amber-ink">PER CHI CREA</span>
          <h3 className="text-[1.8rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[2.3rem]">Foto e video con facce vere, senza rischi legali.</h3>
          <ul className="grid gap-2.5 text-muted">
            <Voce>Persone vere del registro, con il consenso letto prima di ogni scatto.</Voce>
            <Voce>Prezzo in chiaro, e se il volto non tiene non paghi.</Voce>
            <Voce>Certificato pubblico su ogni scatto.</Voce>
          </ul>
          <Link
            href="/match"
            className="mt-4 inline-flex min-h-[54px] w-fit items-center gap-3 rounded-full bg-amber px-7 text-[1rem] font-bold text-on-amber transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-amber-hover active:scale-[0.98]"
          >
            Crea con volti veri
            <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-[0.85rem] font-semibold tabular-nums">da {euro(prezzoDaCent)}</span>
          </Link>
        </div>

        <div data-theme="dark" className="isola flex flex-col gap-4 p-7 sm:p-9">
          <span className="font-mono text-[0.72rem] tracking-[0.06em] text-amber">PER CHI HA UN VOLTO</span>
          <h3 className="text-[1.8rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[2.3rem]">Il tuo gemello digitale lavora. Tu decidi, e sei pagato.</h3>
          <ul className="grid gap-2.5 text-muted">
            <Voce>Registri il tuo volto una volta e scrivi con parole tue cosa non farà mai.</Voce>
            <Voce>A ogni scatto ricevi la tua parte, ogni volta, con il conto in chiaro.</Voce>
            <Voce>Revochi quando vuoi, e le copie fuori dal registro le cerca Ward.</Voce>
          </ul>
          <Link
            href="/entra"
            className="mt-4 inline-flex min-h-[54px] w-fit items-center rounded-full bg-[#F7F4EE] px-7 text-[1rem] font-bold text-[#17150F] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Metti il tuo volto
          </Link>
        </div>
      </div>
    </section>
  );
}
