import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import BadgeClient from "./BadgeClient";

export const metadata = {
  title: "Badge «Volto Verificato»",
  description:
    "Incorpora il badge «Volto Verificato» sul tuo sito: dichiara che dietro un volto c'è una persona reale, consenziente e pagata, con la prova verificabile.",
};

// Pagina ADDITIVA: generatore del badge embeddabile. Non tocca nessun flusso
// esistente; si appoggia all'endpoint /api/badge/<handle> già fatto.
export default async function BadgePage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-[0.14em] text-teal">LO STANDARD</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Badge «Volto Verificato»
            </h1>
            <p className="mt-3 leading-relaxed text-muted">
              Incorpora il badge sul tuo sito o profilo: dichiara che dietro quel volto c&apos;è una{" "}
              <span className="text-foreground">persona reale, consenziente e pagata</span>, e linka alla{" "}
              <span className="text-foreground">prova pubblica</span> nel registro. Il badge si aggiorna da
              solo: se il consenso viene revocato, lo mostra.
            </p>
          </div>

          <BadgeClient initialHandle={handle ?? "random"} />
        </main>
      </div>
    </div>
  );
}
