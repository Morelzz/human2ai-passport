import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import VerifyClient from "./VerifyClient";

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
  // Deep-link: /verify?token=<cert> precompila e verifica subito (usato dai feed,
  // dal badge, dalle segnalazioni). Senza il parametro, comportamento invariato.
  const { token } = await searchParams;
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-xl px-5 py-14 sm:px-8">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-[0.14em] text-teal">SIGIL</span>
            {/* Titolo in display sottile (Geist peso 200, tracking -0.04em) */}
            <h1 className="mt-2 text-4xl font-extralight tracking-[-0.04em] sm:text-5xl">Verifica un contenuto</h1>
            <p className="mt-3 leading-relaxed text-muted">
              <span className="text-foreground">Sigil</span> è il verificatore pubblico di Semblic.
              Carica un&apos;immagine: se è un contenuto Semblic leggiamo la filigrana invisibile e ti mostriamo
              chi l&apos;ha autorizzato e con quale consenso. Se non lo è, possiamo confrontare il volto col
              registro, <span className="text-foreground">a tutela della persona</span>.
            </p>
            {/* Hairline tramonto, lo stesso filo di passport, catalogo e match */}
            <div aria-hidden className="mt-6 h-px" style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.5), var(--hairline) 34%, transparent 72%)" }} />
          </div>
          <VerifyClient initialToken={token ?? ""} />
        </main>
      </div>
    </div>
  );
}
