import Link from "next/link";
import { Button } from "@/components/ui/button";

// Fascia AI Act in home, casa nuova: una card chiara con un velo d'ambra. La
// trasparenza e' legge dal 2 agosto 2026 e per Semblic e' il prodotto, non un
// adeguamento. Rimanda a /ai-act e alla formazione aziende in Academy.
export function AiActStrip() {
  return (
    <section className="mx-auto max-w-7xl px-5 pt-4 sm:px-8">
      <div
        className="card flex flex-col gap-5 border-amber-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
        style={{ background: "linear-gradient(90deg, #FBF1E0, var(--surface) 60%)" }}
      >
        <div>
          <span className="kicker">AI Act · in vigore dal 2 agosto 2026</span>
          <p className="mt-2 text-balance text-[1.15rem] font-semibold leading-snug">La trasparenza che la legge chiede, Semblic la fa già.</p>
          <p className="mt-1.5 max-w-md text-[0.92rem] leading-relaxed text-muted">Certificato, filigrana e consenso verificabile in ogni contenuto. E formazione per le aziende che devono adeguarsi.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary"><Link href="/ai-act">Come siamo conformi</Link></Button>
          <Button asChild variant="secondary"><Link href="/academy#aziende">Formazione aziende</Link></Button>
        </div>
      </div>
    </section>
  );
}
