import { ClipboardList, Users, PackageCheck, ShieldCheck, Fingerprint, Scale } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { Reveal } from "@/components/motion/Reveal";
import { InquiryForm } from "@/components/business/InquiryForm";
import { fotoPagina } from "@/lib/foto-pagine";
import { Copertina } from "@/components/marketing/pagine/Copertina";

export const metadata = {
  title: "SEMBLIC Studio",
  description:
    "Descrivi la campagna, consegniamo i contenuti finiti: volti reali e consenzienti, fedeltà certificata, prova di provenienza inclusa.",
};

// B4 — SEMBLIC Studio (EXPANSION_V3): il livello "done for you". Il brand
// descrive la campagna, noi consegniamo i contenuti finiti con avatar
// consenzienti. Pagina narrativa + form: vende il servizio e genera richieste.
export default async function StudioPage() {
  const copertina = await fotoPagina("studio");
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        {/* Hero */}
        <Copertina
          copertina={copertina}
          occhiello="Semblic Studio"
          titolo="Tu descrivi la campagna. Noi consegniamo i contenuti finiti."
          sotto="Il servizio completo: brief, volto giusto dal registro, produzione con i nostri motori, consegna con certificato di provenienza. Tu firmi il brief, noi il resto."
          azioni={<a href="#brief" className="inline-flex h-12 items-center rounded-full bg-amber px-6 text-[0.98rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">Racconta la campagna</a>}
        />

        {/* Come funziona */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { Icon: ClipboardList, t: "1 · Il brief", d: "Ci racconti obiettivo, tono, formati e dove vivranno i contenuti. Mezz'ora del tuo tempo, non di più.", c: "#9A4A0B" },
                { Icon: Users, t: "2 · Il volto giusto", d: "Selezioniamo dal registro la persona consenziente più adatta, consenso all'uso commerciale verificato, royalty alla persona inclusa.", c: "#B0472B" },
                { Icon: PackageCheck, t: "3 · La consegna", d: "Ricevi i contenuti finiti, in alta risoluzione, ognuno con la sua prova di provenienza verificabile.", c: "#2F7563" },
              ].map(({ Icon, t, d, c }) => (
                <div key={t} className="card transition-colors hover:border-amber/60 rounded-2xl p-6">
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

        {/* Perché lo Studio */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <span className="kicker">Perché lo Studio</span>
            <h2 className="mt-3 max-w-2xl text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              La velocità dell&apos;AI, senza il rischio legale.
            </h2>
            <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-3">
              {[
                { Icon: ShieldCheck, t: "Consenso documentato", d: "Ogni volto ha firmato il consenso all'uso commerciale. Lo dimostra un token pubblico." },
                { Icon: Fingerprint, t: "Fedeltà certificata", d: "Identity-lock sui tratti reali della persona: il volto è suo, non un'approssimazione." },
                { Icon: Scale, t: "Zero cause", d: "Niente volti rubati, niente sintetico spacciato per vero: la prova di provenienza è nel file." },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
                  <div>
                    <h3 className="text-sm font-bold">{t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Form */}
        <Reveal>
          <section id="brief" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-12 pb-24 sm:px-8">
            <div className="card relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(242,169,59,0.10),transparent_70%)]" />
              <div className="relative">
                <span className="kicker">Parlaci della campagna</span>
                <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Il primo brief è senza impegno.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                  Rispondiamo entro 48 ore lavorative con una proposta: volti adatti, formati e preventivo.
                </p>
                <div className="mt-8">
                  <InquiryForm
                    kind="studio"
                    messageLabel="La campagna"
                    messagePlaceholder="Obiettivo, prodotto, formati che ti servono (social, ADV, e-commerce…), tempi…"
                    cta="Richiedi una proposta"
                  />
                </div>
              </div>
            </div>
          </section>
        </Reveal>
        <Footer />
      </div>
    </div>
  );
}
