"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

// Errore di casa: se una pagina si rompe, il visitatore resta dentro Semblic
// (stessa voce della 404) invece di vedere la schermata grezza di Next.
// Client component per contratto di Next: la barra completa (SiteNav) legge la
// sessione lato server e qui non si puo' usare, quindi basta il marchio, come nel footer.
export default function Errore({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/semblic-mark.png" alt="" aria-hidden className="h-8 w-8 object-contain" />
            <span className="text-[0.85rem] font-bold tracking-[0.18em]">SEMBLIC</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-5 px-5 py-20 sm:px-8">
        <span className="kicker">Qualcosa si è inceppato</span>
        <h1 className="text-balance text-[2.6rem] font-bold leading-[1] tracking-[-0.04em] sm:text-[4rem]">
          Questa pagina non è partita. Riprova.
        </h1>
        <p className="max-w-[52ch] text-pretty text-[1.05rem] leading-relaxed text-muted">
          Ci è arrivata la segnalazione e ci stiamo guardando. I tuoi dati e il registro dei volti non sono stati toccati.
          {error.digest && <span className="mt-2 block font-mono text-[0.8rem] text-faint">Codice: {error.digest}</span>}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => reset()}>Riprova</Button>
          <Button asChild size="lg" variant="secondary"><Link href="/">Torna alla home</Link></Button>
        </div>
      </main>
    </div>
  );
}
