import Link from "next/link";
import { Button } from "@/components/ui/button";

// Fascia AI Act in home (sotto Sigil/Trust): la trasparenza e' legge dal
// 2 agosto 2026 e per Semblic e' il prodotto, non un adeguamento. Rimanda
// alla pagina /ai-act e alla formazione aziende in Academy.
export function AiActStrip() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="glass glass-hover relative flex flex-col gap-6 overflow-hidden rounded-[2rem] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg, #F2A93B, #EE7A70, transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 90% at 0% 0%, rgba(242,169,59,0.10), transparent 60%)" }} />
        <div className="relative">
          <span className="label-mono" style={{ color: "#F2A93B" }}>AI Act · 2 agosto 2026</span>
          <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            La trasparenza ora e&apos; legge. Qui lo era gia&apos;.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Certificato, filigrana e consenso verificabile in ogni contenuto. E formazione per le
            aziende che devono adeguarsi.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <Button asChild><Link href="/ai-act">Come siamo conformi</Link></Button>
          <Button asChild variant="secondary"><Link href="/academy#aziende">Formazione aziende</Link></Button>
        </div>
      </div>
    </section>
  );
}
