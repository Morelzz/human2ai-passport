import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/marketing/SectionTitle";

// [SIGIL, il verificatore], casa nuova: sezione chiara a due colonne. A sinistra
// cos'e' (carichi un contenuto, sai se dietro c'e' una persona reale,
// consenziente e pagata), a destra la card del verificatore con un esito
// d'esempio. Copy: niente trattini lunghi.
export function Trust() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-8 px-5 pt-20 sm:px-8 sm:pt-24 lg:grid-cols-2 lg:gap-14">
      <div>
        <SectionTitle kicker="Sigil, il verificatore" subtitle="Carica un'immagine: Sigil legge la filigrana invisibile e il certificato, e ti dice se è nata in Semblic e con quale consenso. Non chiediamo fiducia: la rendiamo verificabile." className="mb-6 sm:mb-7">
          Verifica chi c&apos;è dietro a un contenuto.
        </SectionTitle>
        <Button asChild variant="ink" size="lg"><Link href="/verify">Verifica con Sigil</Link></Button>
      </div>

      <div className="card flex flex-col gap-4 p-4 sm:p-6" aria-label="Esempio di verifica">
        <div className="flex h-[140px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-edge px-6 text-center text-[0.92rem] text-faint sm:h-[160px]">
          Trascina qui un&apos;immagine, o scattala
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-verified-soft p-4">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-verified" />
          <div className="min-w-0">
            <p className="text-[0.98rem] font-semibold text-on-verified">Nata in Semblic, consenso attivo</p>
            <p className="text-[0.82rem] text-[#2E6F5B]">Gabriella · certificato c4468df7 · 14 settembre 2026</p>
          </div>
        </div>
      </div>
    </section>
  );
}
