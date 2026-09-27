import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import VerifyClient from "./VerifyClient";
import { fotoPagina } from "@/lib/foto-pagine";
import { Copertina } from "@/components/marketing/pagine/Copertina";

// Il portale della campagna: i link /verify (e i deep-link ?token=) vengono
// condivisi da badge, segnalazioni e feed. Solo title/description propri (SEO +
// tab del browser); la card social e' quella di default del sito
// (app/opengraph-image.tsx), ereditata dal layout senza override di openGraph.
export const metadata = {
  title: "Sigil · Verifica un contenuto",
  description:
    "Carica un'immagine: se è un contenuto Semblic leggiamo la filigrana invisibile e mostriamo chi l'ha autorizzato e con quale consenso, a tutela della persona.",
  alternates: { canonical: "/verify" },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const copertina = await fotoPagina("verify");
  // Deep-link: /verify?token=<cert> precompila e verifica subito (usato dai feed,
  // dal badge, dalle segnalazioni). Senza il parametro, comportamento invariato.
  const { token } = await searchParams;
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        <Copertina
          copertina={token ? null : copertina}
          taglio="lato"
          occhiello="Sigil, il verificatore pubblico"
          titolo="Ogni scatto porta la sua prova."
          sotto={
            <>
              Carica un&apos;immagine: se è un contenuto Semblic leggiamo la filigrana invisibile e ti mostriamo chi l&apos;ha
              autorizzato e con quale consenso. Se non lo è, possiamo confrontare il volto col registro, a tutela della persona.
              {copertina && !token && <span className="mt-3 block text-[0.92rem] text-white/55">Prova con questo: tocca il cartellino in alto e Sigil legge il suo certificato.</span>}
            </>
          }
          azioni={<a href="#verifica" className="inline-flex h-12 items-center rounded-full bg-amber px-6 text-[0.98rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">Verifica un contenuto</a>}
        />
        <main id="verifica" className="mx-auto max-w-xl scroll-mt-24 px-5 py-10 sm:px-8 sm:py-14">
          <VerifyClient initialToken={token ?? ""} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
