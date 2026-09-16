import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";

// 404 di casa: la pagina non c'e', ma la porta d'ingresso si'. Chiara come il
// resto del sito, con le due uscite che servono davvero.
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <SiteNav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-5 px-5 py-20 sm:px-8">
        <span className="kicker">Errore 404</span>
        <h1 className="text-balance text-[2.6rem] font-bold leading-[1] tracking-[-0.04em] sm:text-[4rem]">
          Questa pagina non c&apos;è. Le persone sì.
        </h1>
        <p className="max-w-[52ch] text-pretty text-[1.05rem] leading-relaxed text-muted">
          Il link può essere vecchio o scritto male. Il registro dei volti e la verifica dei contenuti sono sempre qui.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg"><Link href="/">Torna alla home</Link></Button>
          <Button asChild size="lg" variant="secondary"><Link href="/catalogo">Vedi il registro</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
