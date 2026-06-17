import Link from "next/link";
import { Building2, Users, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";
import { SediMap } from "@/components/marketing/SediMap";
import { getSedi } from "@/lib/scan";

export const metadata = {
  title: "La scansione umana",
  description:
    "La scansione è l'ingresso nel registro: una sessione fotografica professionale che trasforma il tuo volto in un avatar che lavora per te, alle tue condizioni.",
};

// H1 — pagina /scansione. TESTI VERBATIM da docs/SITE_COPY_SCANSIONE.md
// (adattato solo il markup, mai i testi). Ordine: Hero → Il percorso →
// Lo standard → Prepararsi → La mappa → CTA finale.
// - Lo slot mappa è un segnaposto: H4 lo sostituisce con Leaflet + tabella sedi.
// - [Parametri minimi — DA MORELZ] è visibile SOLO in dev (nota del copy doc).

const BOOKING_HREF = "/scansione/prenota"; // H2 — il booking vero

export default async function ScansionePage() {
  const isDev = process.env.NODE_ENV !== "production";
  // H4 — sedi per la mappa (tabella `sedi`; fallback Studio Void se assente).
  const sedi = await getSedi();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
          <span className="label-mono text-teal">La scansione umana</span>
          <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
            <KineticText text="Il momento in cui il tuo volto" />
            <span className="mt-1 block">
              <KineticText text="diventa tuo" gradient delay={0.3} />{" "}
              <KineticText text="per sempre." delay={0.45} />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            La scansione è l&apos;ingresso nel registro: una sessione fotografica professionale
            che cattura il tuo volto com&apos;è davvero, e lo trasforma in un avatar che lavora
            per te, alle tue condizioni.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href={BOOKING_HREF}>Prenota la tua scansione</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#standard">Leggi lo standard</Link></Button>
          </div>
        </section>

        {/* ── IL PERCORSO ──────────────────────────────────────────────── */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
            <span className="label-mono text-violet-light">Il percorso</span>
            <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Come si entra nel registro
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  Icon: Building2,
                  n: "01",
                  t: "In studio, da noi.",
                  d: "La via maestra: una sessione nello studio Void di Rimini, con il protocollo completo SEMBLIC-SCAN. Il risultato è il massimo livello di fedeltà: l'avatar SOUL o HUMAN, identico a te.",
                  c: "#F2A93B",
                },
                {
                  Icon: Users,
                  n: "02",
                  t: "Da un partner certificato.",
                  d: "La rete dei Capture Partner cresce città per città: fotografi e videomaker certificati sul nostro protocollo, vicino a casa tua. Guarda la mappa qui sotto.",
                  c: "#7FAE96",
                },
                {
                  Icon: Compass,
                  n: "03",
                  t: "In autonomia, secondo lo standard.",
                  d: "Hai accesso a un set fotografico? Lo standard SEMBLIC-SCAN è pubblico: seguilo, invia il materiale, e la piattaforma verifica la qualità prima dell'ingresso nel registro. I requisiti sono gratis. Il rigore no: quello lo controlliamo noi.",
                  c: "#EE7A70",
                },
              ].map(({ Icon, n, t, d, c }) => (
                <div key={n} className="glass glass-hover rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${c}1a`, border: `1px solid ${c}55` }}>
                      <Icon className="h-5 w-5" style={{ color: c }} />
                    </span>
                    <span className="font-mono text-xs font-extrabold" style={{ color: c }}>{n}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ── LO STANDARD SEMBLIC-SCAN ────────────────────────────────────── */}
        <Reveal>
          <section id="standard" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-12 sm:px-8">
            <span className="label-mono text-teal">Specifica pubblica</span>
            <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Lo standard SEMBLIC-SCAN
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              Lo standard è pubblico, perché gli standard vivono alla luce. Questi sono i
              requisiti che ogni scansione deve rispettare per entrare nel registro,
              chiunque la esegua.
            </p>

            {/* Il set — scheda tecnica */}
            <div className="mt-8 flex flex-col gap-3">
              <SpecRow code="LUCI ×6">
                <strong className="text-foreground">Sei luci.</strong> Due frontali a 45°, due posteriori, una dedicata
                al fondale bianco, una zenitale sopra il soggetto. Il volto va letto da ogni direzione:
                l&apos;ombra nasconde, e qui niente deve nascondersi.
              </SpecRow>
              <SpecRow code="CAMERA">
                <strong className="text-foreground">Camera su cavalletto, frontale al soggetto.</strong> Inquadratura
                stabile e costante per l&apos;intera sessione.
                {isDev && (
                  <span className="mt-2 block rounded-lg border border-amber/35 bg-amber/10 px-3 py-2 font-mono text-[0.72rem] text-amber">
                    [Parametri minimi: risoluzione, ottica, DA MORELZ] · segnaposto visibile solo in dev
                  </span>
                )}
              </SpecRow>
              <SpecRow code="SOGGETTO">
                <strong className="text-foreground">Il soggetto su piastra rotante elettronica.</strong> Una rotazione
                completa e controllata: è la piastra che gira, non la persona che si mette in posa.
              </SpecRow>
              <SpecRow code="VOLUME">
                <strong className="text-foreground">Circa cento scatti per sessione.</strong> Da questi, la selezione
                delle immagini che entrano nel database e costruiscono l&apos;avatar.
              </SpecRow>
            </div>

            {/* La postproduzione — il punto che ci distingue */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="glass rounded-2xl border-teal/25 p-6">
                <span className="label-mono text-teal">Consentito</span>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Correzione colore; rimozione delle imperfezioni temporanee,
                  occhiaie, un brufolo, i segni di una giornata storta.{" "}
                  <strong className="text-foreground">Il tempo passa, tu resti.</strong>
                </p>
              </div>
              <div className="glass rounded-2xl border-crimson/25 p-6">
                <span className="label-mono text-crimson-light">Vietato, sempre</span>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Qualsiasi modifica alla geometria del volto. Proporzioni, naso, mascella, occhi:
                  non si toccano. La struttura umana resta al cento per cento,{" "}
                  <strong className="text-foreground">perché l&apos;identità non è una base di partenza. È il prodotto.</strong>
                </p>
              </div>
            </div>

            {/* L'ingrandimento */}
            <div className="glass mt-3 rounded-2xl p-6">
              <span className="label-mono text-violet-light">L&apos;ingrandimento</span>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Le immagini selezionate vengono portate alla massima risoluzione con upscaling
                conservativo: più informazione per i motori, nessun dettaglio inventato. Ogni
                avatar viene poi verificato contro le foto originali,{" "}
                <strong className="text-foreground">se non sei tu, non esce.</strong>
              </p>
            </div>

            <p className="mt-8 text-balance text-center text-sm leading-relaxed text-muted">
              I requisiti sono gratuiti. La maestria si impara: il protocollo completo,
              esecuzione, postproduzione, certificazione, è il corso avanzato della{" "}
              <span className="text-foreground">SEMBLIC Academy</span>, la porta del{" "}
              <Link href="/partner" className="text-violet-light underline-offset-2 hover:underline">programma Capture Partner</Link>.
            </p>
          </section>
        </Reveal>

        {/* ── PREPARARSI ALLA SCANSIONE ────────────────────────────────── */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
            <span className="label-mono text-violet-light">Per te, non per il fotografo</span>
            <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Prima della tua sessione
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              La scansione dura meno di quanto pensi e non richiede di saper &laquo;posare&raquo;.
              Bastano poche attenzioni, e il resto lo facciamo noi.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {[
                { t: "Vieni come sei, davvero.", d: "Trucco leggero o assente: l'avatar deve partire dal tuo volto, non da una versione di scena. Le occhiaie le togliamo noi; la tua faccia no." },
                { t: "Capelli in ordine, non in posa.", d: "Come li porti normalmente. Niente acconciature che non rifaresti mai." },
                { t: "Abiti semplici, tinta unita.", d: "Niente loghi, niente fantasie fitte: in scansione conta il volto, il resto è rumore." },
                { t: "Riposa la sera prima.", d: "Sembra un consiglio della nonna; è un consiglio tecnico. Un volto riposato dà più informazione pulita ai motori." },
                { t: "Cosa succede in sessione:", d: "sali su una piastra che ruota da sola, la camera resta ferma, scattiamo circa cento fotografie in pochi minuti. Non devi fare niente, è il punto: devi solo essere te." },
                { t: "E dopo:", d: "selezioniamo le immagini migliori, le lavoriamo secondo lo standard, e costruiamo il tuo avatar. Quando entra nel registro, ricevi il tuo passaporto pubblico: da quel momento il tuo volto lavora solo se tu dici sì." },
              ].map((x) => (
                <div key={x.t} className="glass flex gap-4 rounded-2xl p-5">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  <p className="m-0 text-sm leading-relaxed text-muted">
                    <strong className="text-foreground">{x.t}</strong> {x.d}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ── LA MAPPA — "Dove scansionarti" ───────────────────────────── */}
        <Reveal>
          <section className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
            <span className="label-mono text-teal">Dove scansionarti</span>
            <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Ogni punto è una sede certificata
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              Ogni punto sulla mappa è una sede certificata sul protocollo SEMBLIC-SCAN.
              La rete cresce città per città.
            </p>

            {/* H4 — mappa Leaflet: i pin vengono dalla tabella `sedi` */}
            <div className="mt-8">
              <SediMap sedi={sedi.map((s) => ({ slug: s.slug, name: s.name, city: s.city, lat: s.lat, lng: s.lng, status: s.status }))} />
            </div>

            <p className="mt-6 text-center text-sm leading-relaxed text-muted">
              La tua città non c&apos;è? <strong className="text-foreground">Diventa tu il punto di scansione.</strong>{" "}
              <Link href="/partner" className="font-semibold text-violet-light underline-offset-2 hover:underline">Il programma Capture Partner →</Link>
            </p>
          </section>
        </Reveal>

        {/* ── CTA FINALE ───────────────────────────────────────────────── */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 pb-24 pt-8 text-center sm:px-8">
            <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              <KineticText text="Cento scatti. Un passaporto." />
              <span className="mt-1 block"><KineticText text="Il tuo volto, tuo." gradient delay={0.3} /></span>
            </h2>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg"><Link href={BOOKING_HREF}>Prenota la tua scansione</Link></Button>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

// Riga di specifica in stile scheda tecnica (codice mono a sinistra).
function SpecRow({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="glass flex flex-col gap-2 rounded-2xl p-5 sm:flex-row sm:gap-5">
      <span className="shrink-0 font-mono text-[0.68rem] font-extrabold tracking-[0.12em] text-teal sm:w-24 sm:pt-0.5">{code}</span>
      <p className="m-0 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
