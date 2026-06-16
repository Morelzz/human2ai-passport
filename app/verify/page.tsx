import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import VerifyClient from "./VerifyClient";

// Il portale della campagna: i link /verify (e i deep-link ?token=) vengono
// condivisi da badge, segnalazioni e feed. Metadata propri perche' la card
// social non resti generica (l'og:title non eredita il titolo pagina).
export const metadata = {
  title: "Verifica un contenuto",
  description:
    "Carica un'immagine: se è un contenuto Human2AI leggiamo la filigrana invisibile e mostriamo chi l'ha autorizzato e con quale consenso, a tutela della persona.",
  openGraph: {
    title: "Verifica un contenuto | Human2AI",
    description:
      "Scopri se un'immagine è un contenuto Human2AI certificato: chi l'ha autorizzato e con quale consenso, a tutela della persona reale.",
  },
  twitter: {
    title: "Verifica un contenuto | Human2AI",
    description:
      "Scopri se un'immagine è un contenuto Human2AI certificato: chi l'ha autorizzato e con quale consenso.",
  },
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
            <span className="text-xs font-bold tracking-[0.14em] text-teal">VERIFICA</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Verifica un contenuto</h1>
            <p className="mt-3 leading-relaxed text-muted">
              Carica un&apos;immagine: se è un contenuto <span className="text-foreground">Human2AI</span> leggiamo
              la filigrana invisibile e ti mostriamo chi l&apos;ha autorizzato e con quale consenso. Se non lo è,
              possiamo confrontare il volto col registro, <span className="text-foreground">a tutela della persona</span>.
            </p>
          </div>
          <VerifyClient initialToken={token ?? ""} />
        </main>
      </div>
    </div>
  );
}
