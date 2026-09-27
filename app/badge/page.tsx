import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import BadgeClient from "./BadgeClient";
import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";

export const metadata = {
  title: "Badge «Volto Verificato»",
  description:
    "Incorpora il badge «Volto Verificato» sul tuo sito: dichiara che dietro un volto c'è una persona reale, consenziente e pagata, con la prova verificabile.",
  alternates: { canonical: "/badge" },
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
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        <TestataTesto
          larghezza="max-w-3xl"
          occhiello="Lo standard"
          titolo="Il badge «Volto Verificato»."
          sotto="Incorpora il badge sul tuo sito o profilo: dichiara che dietro quel volto c'è una persona reale, consenziente e pagata, e porta alla prova pubblica nel registro. Si aggiorna da solo: se il consenso viene revocato, lo mostra."
          dato="si aggiorna da solo"
        />
        <main className="mx-auto max-w-3xl px-5 pb-14 sm:px-8 sm:pb-20">

          <BadgeClient initialHandle={handle ?? "random"} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
