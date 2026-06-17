import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS } from "@/content/faq";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = {
  title: "Domande frequenti",
  description:
    "Le risposte alle domande più comuni su Semblic: sicurezza dei dati, revoca del consenso, royalty, verifica dei contenuti e segnalazioni.",
};

// Review C6 — /faq: struttura + schema FAQPage. Le domande/risposte vivono in
// content/faq.ts (fonte unica per pagina e JSON-LD): i testi definitivi di
// Morelz si incollano lì. Accordion nativo <details> (accessibile, zero JS).
export default function FaqPage() {
  // Schema FAQPage per i motori di ricerca, generato dagli stessi dati.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="text-center">
            <span className="label-mono text-teal">Domande frequenti</span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
              Le domande giuste. <span className="text-gradient">Risposte oneste.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Il tuo volto, i tuoi dati, i tuoi soldi: qui c&apos;è scritto come funziona davvero.
              Se non trovi la risposta, scrivici.
            </p>
          </div>

          <Reveal>
            <div className="mt-12 flex flex-col gap-3">
              {FAQ_ITEMS.map((it) => (
                <details
                  key={it.q}
                  className="group glass overflow-hidden rounded-2xl open:border-violet/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[0.95rem] font-bold leading-snug transition-colors hover:text-violet-light sm:px-6 [&::-webkit-details-marker]:hidden">
                    {it.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-white/6 px-5 py-4 sm:px-6">
                    <p className="text-sm leading-relaxed text-muted">{it.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </Reveal>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted">
              Non hai trovato la tua domanda?{" "}
              <Link href="/report" className="font-semibold text-violet-light hover:underline">
                Segnala un problema
              </Link>{" "}
              o verifica un contenuto su{" "}
              <Link href="/verify" className="font-semibold text-teal hover:underline">
                /verify
              </Link>
              .
            </p>
          </div>
        </section>
      </div>

      {/* Schema FAQPage (stessa fonte dei contenuti visibili) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
