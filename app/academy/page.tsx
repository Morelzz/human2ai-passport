import Link from "next/link";
import { GraduationCap, Sparkles, Award } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { getCorsi, CorsoLivello } from "@/lib/academy";

export const metadata = {
  title: "Academy",
  description:
    "La SEMBLIC Academy: dal corso base gratuito sui diritti d'immagine al percorso avanzato che certifica i Capture Partner.",
};

// G — pagina narrativa dell'Academy: racconta i TRE prodotti (base/medio/
// avanzato) leggendo i corsi dal modello dati (supabase/academy.sql, fallback
// in lib/academy se la migrazione manca). I contenuti veri arrivano per
// gradi: qui nessuna iscrizione finta, solo la mappa onesta di cosa sarà.

const LIVELLO_UI: Record<CorsoLivello, { label: string; accesso: string; c: string; Icon: typeof GraduationCap }> = {
  base: { label: "Base", accesso: "Gratuito per gli iscritti", c: "#7FAE96", Icon: GraduationCap },
  medio: { label: "Medio", accesso: "Con abbonamento", c: "#F2A93B", Icon: Sparkles },
  avanzato: { label: "Avanzato", accesso: "A pagamento · certificante", c: "#EE7A70", Icon: Award },
};

export default async function AcademyPage() {
  const corsi = await getCorsi();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-mono text-teal">SEMBLIC Academy</span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
              <KineticText text="Capire i propri diritti" />
              <span className="mt-1 block">
                <KineticText text="è il primo modo di" delay={0.25} />{" "}
                <KineticText text="possederli" gradient delay={0.45} />
                <KineticText text="." delay={0.55} />
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Tre percorsi, tre pubblici: chi vuole capire, chi vuole creare, chi vuole farne un
              mestiere. I corsi aprono per gradi, questo è il disegno, onesto e completo.
            </p>
          </div>

          <Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {corsi.map((corso) => {
                const ui = LIVELLO_UI[corso.livello];
                return (
                  <div key={corso.slug} className="glass glass-hover relative flex flex-col overflow-hidden rounded-[2rem] p-6">
                    <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${ui.c}, transparent)` }} />
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${ui.c}1a`, border: `1px solid ${ui.c}55` }}>
                        <ui.Icon className="h-5 w-5" style={{ color: ui.c }} />
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ background: `${ui.c}1a`, color: ui.c }}>
                        {ui.label}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-extrabold leading-tight">{corso.titolo}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{corso.descrizione}</p>
                    <div className="mt-5 border-t border-white/6 pt-4">
                      <p className="text-xs font-semibold" style={{ color: ui.c }}>{ui.accesso}</p>
                      <p className="mt-0.5 text-[0.7rem] text-faint">Per: {corso.pubblico}</p>
                      {corso.certificante && (
                        <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">
                          L&apos;esame finale è il requisito della certificazione{" "}
                          <Link href="/partner" className="text-violet-light underline-offset-2 hover:underline">Capture Partner</Link>.
                        </p>
                      )}
                      <span className="mt-3 inline-block rounded-full border border-white/15 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted">
                        {corso.pubblicato ? "Disponibile" : "In preparazione"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal>
            <div className="mx-auto mt-14 max-w-xl text-center">
              <p className="text-balance text-lg font-semibold leading-relaxed text-foreground">
                Il corso avanzato non insegna soltanto: <span className="text-gradient">apre la rete</span>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Lo standard SEMBLIC-SCAN è <Link href="/scansione#standard" className="text-teal underline-offset-2 hover:underline">pubblico e gratuito</Link>.
                La maestria, esecuzione, postproduzione, certificazione, si impara qui, e chi supera
                l&apos;esame diventa un punto di scansione sulla mappa.
              </p>
              <p className="mt-6">
                <Link href="/partner" className="text-sm font-semibold text-violet-light transition-colors hover:text-foreground">
                  Il programma Capture Partner →
                </Link>
              </p>
            </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
}
