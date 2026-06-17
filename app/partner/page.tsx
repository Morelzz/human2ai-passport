import { Camera, FileSignature, MapPin, Coins, Repeat, Handshake } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { ApplyForm } from "./ApplyForm";

export const metadata = {
  title: "Diventa Capture Partner",
  description:
    "La rete di fotografi e videomaker certificati SEMBLIC: porta le persone reali dentro il registro, guadagna su ogni volto che porti.",
};

// B1 — pagina narrativa Capture Partner (EXPANSION_V3): racconta il programma
// e raccoglie candidature. Il flusso completo (onboarding, dashboard, revenue
// share) arriva dopo il lancio: qui si costruisce la lista d'attesa reale.
export default function PartnerPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        {/* Hero — il messaggio di reclutamento del doc */}
        <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
          <span className="label-mono text-teal">Capture Partner Program</span>
          <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
            <KineticText text="L'AI ti ha tolto lavoro?" />
            <span className="mt-2 block">
              <KineticText text="Diventa chi acquisisce i volti per" delay={0.25} />{" "}
              <KineticText text="l'AI etica" gradient delay={0.5} />
              <KineticText text="." delay={0.6} />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Ogni volto del registro nasce da uno shooting vero, fatto da un professionista vero.
            Stiamo costruendo la rete di fotografi e videomaker certificati SEMBLIC: i punti
            d&apos;ingresso fisici della piattaforma, città per città.
          </p>
        </section>

        {/* Cosa fa un partner */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
            <span className="label-mono text-violet-light">Cosa fa un partner</span>
            <h2 className="mt-3 max-w-2xl text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tre responsabilità, un protocollo certificato.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { Icon: Camera, t: "Acquisizione", d: "Lo shooting secondo il protocollo SEMBLIC: i set di pose e la qualità che servono all'identity-lock dei motori.", c: "#F2A93B" },
                { Icon: FileSignature, t: "Consenso on-site", d: "La firma del consenso avviene davanti a te, sul posto, con la persona. Tu sei il garante fisico del nostro filtro.", c: "#B8005C" },
                { Icon: MapPin, t: "La tua città", d: "Sei il riferimento SEMBLIC della tua zona: eventi di acquisizione, brand locali, persone che vogliono entrare nel registro.", c: "#00A896" },
              ].map(({ Icon, t, d, c }) => (
                <div key={t} className="glass glass-hover rounded-2xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${c}1a`, border: `1px solid ${c}55` }}>
                    <Icon className="h-5 w-5" style={{ color: c }} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Cosa ci guadagni */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
            <span className="label-mono text-crimson-light">Cosa ci guadagni</span>
            <h2 className="mt-3 max-w-2xl text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tre flussi, non una marchetta.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { Icon: Coins, t: "Fee di acquisizione", d: "Un compenso per ogni persona che porti nel registro e superi la verifica.", c: "#00A896" },
                { Icon: Repeat, t: "Quota ricorrente", d: "Una percentuale sulle royalty generate dai volti che hai acquisito. Per tutta la loro vita sulla piattaforma.", c: "#F2A93B" },
                { Icon: Handshake, t: "Ingaggi reali", d: "Quando un brand vuole lo shooting vero con la persona vera, il partner della sua città è il primo a essere chiamato.", c: "#B8005C" },
              ].map(({ Icon, t, d, c }) => (
                <div key={t} className="glass glass-hover rounded-2xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${c}1a`, border: `1px solid ${c}55` }}>
                    <Icon className="h-5 w-5" style={{ color: c }} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-faint">
              Il programma parte in Italia e si apre per gradi: prima i partner fondatori, poi la rete.
              Le condizioni economiche definitive vengono presentate al momento della certificazione.
            </p>
          </section>
        </Reveal>

        {/* Come funziona + form */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 py-12 pb-24 sm:px-8">
            <div className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(0,168,150,0.10),transparent_70%)]" />
              <div className="relative">
                <span className="label-mono text-teal">Candidature aperte</span>
                <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Tre passi: candidatura, certificazione, operatività.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                  Ti candidi qui. Se il profilo è giusto, ti contattiamo per il percorso di
                  certificazione sul protocollo (acquisizione, consenso, qualità). Poi sei
                  il Capture Partner della tua città.
                </p>
                <div className="mt-8">
                  <ApplyForm />
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
