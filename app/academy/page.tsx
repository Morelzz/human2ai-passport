import Link from "next/link";
import { GraduationCap, Sparkles, Award, Palette, Code2, Camera, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { TeamSection } from "@/components/marketing/TeamSection";
import { getCorsi, CorsoLivello } from "@/lib/academy";

export const metadata = {
  title: "Academy, la scuola dei diritti d'immagine",
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

// Formazione in azienda: i percorsi che l'AI Act rende urgenti (personale
// formato sugli strumenti AI in uso). Livelli come chip; contenuti erogati
// su richiesta via /contatti (prefill ?tema=formazione).
const LIVELLI_AZIENDE = [
  { label: "Base", c: "#7FAE96" },
  { label: "Operativo", c: "#F2A93B" },
  { label: "Avanzato", c: "#EE7A70" },
];

const PERCORSI_AZIENDE = [
  {
    Icon: Palette,
    c: "#F2A93B",
    titolo: "Generazione visiva con metodo",
    strumenti: "Semblic · Higgsfield",
    descrizione:
      "Generare immagini con un fine logico e una brand identity ben delineata: volti consenzienti su Semblic, scene e campagne su piattaforme come Higgsfield, senza perdere coerenza di marca.",
    livelli: 3,
  },
  {
    Icon: Code2,
    c: "#9B8CFF",
    titolo: "Costruire con Claude Code",
    strumenti: "Siti · gestionali · automazioni",
    descrizione:
      "L'uso serio e professionale dell'AI che scrive software: creare siti, gestionali e strumenti interni con Claude Code, con un metodo di lavoro vero, non prompt a caso.",
    livelli: 3,
  },
  {
    Icon: Camera,
    c: "#7FAE96",
    titolo: "Fotografia aumentata",
    strumenti: "Media team · content creator",
    descrizione:
      "Mescolare set reale e AI: i tuoi operatori fotografici potenziati dalla generazione, gli scatti veri come base di continuita' per le immagini generate. Il tuo stile, moltiplicato.",
    livelli: 3,
  },
  {
    Icon: Scale,
    c: "#EE7A70",
    titolo: "Conformita' nell'uso quotidiano",
    strumenti: "AI Act in pratica",
    descrizione:
      "Cosa dichiarare, come marcare, cosa non fare: le regole del 2 agosto 2026 tradotte in procedure semplici per chi ogni giorno pubblica contenuti generati.",
    livelli: 2,
  },
];

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
                    <div className="mt-5 border-t border-border pt-4">
                      <p className="text-xs font-semibold" style={{ color: ui.c }}>{ui.accesso}</p>
                      <p className="mt-0.5 text-[0.7rem] text-faint">Per: {corso.pubblico}</p>
                      {corso.certificante && (
                        <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">
                          L&apos;esame finale è il requisito della certificazione{" "}
                          <Link href="/partner" className="text-violet-light underline-offset-2 hover:underline">Capture Partner</Link>.
                        </p>
                      )}
                      <span className="mt-3 inline-block rounded-full border border-border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted">
                        {corso.pubblicato ? "Disponibile" : "In preparazione"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* ── FORMAZIONE PER LE AZIENDE ─────────────────────────────── */}
          <section id="aziende" className="scroll-mt-24 pt-16 sm:pt-20">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <span className="label-mono" style={{ color: "#F2A93B" }}>Formazione per le aziende</span>
                <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  L&apos;AI Act chiede anche <span className="text-gradient">competenza</span>.<br />
                  Noi la insegniamo.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
                  Il Regolamento europeo richiede alle aziende personale formato sugli strumenti AI
                  che usa. La SEMBLIC Academy porta la formazione in azienda: percorsi a piu&apos;
                  livelli, sul serio, dagli strumenti di frontiera al metodo.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {PERCORSI_AZIENDE.map((p) => (
                  <div key={p.titolo} className="glass glass-hover relative flex flex-col overflow-hidden rounded-[2rem] p-6">
                    <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${p.c}, transparent)` }} />
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${p.c}1a`, border: `1px solid ${p.c}55` }}>
                        <p.Icon className="h-5 w-5" style={{ color: p.c }} />
                      </span>
                      <span className="label-mono text-faint">{p.strumenti}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold leading-tight">{p.titolo}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.descrizione}</p>
                    <div className="mt-5 flex gap-2 border-t border-border pt-4">
                      {LIVELLI_AZIENDE.slice(0, p.livelli).map((l) => (
                        <span key={l.label} className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ background: `${l.c}1a`, color: l.c }}>
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-8 text-center">
                <Button asChild size="lg">
                  <Link href="/contatti?tema=formazione">Richiedi la formazione per la tua azienda</Link>
                </Button>
              </div>
            </Reveal>
          </section>

          <Reveal>
            <TeamSection
              eyebrow="I docenti"
              title="Scopri chi insegna"
              subtitle="Le persone che tengono i percorsi: chi ha costruito lo standard e chi lo trasmette."
            />
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
