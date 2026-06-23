import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SediMap, type MapSede } from "@/components/marketing/SediMap";
import { GradientFlowText } from "@/components/marketing/GradientFlowText";
import { SectionTitle } from "@/components/marketing/SectionTitle";

// [SEDI DI SCANSIONE] — Sezione homepage: riusa la mappa REALE delle sedi
// (SediMap, Leaflet + OpenStreetMap, pin dalla tabella `sedi`) gia usata in
// /scansione, con i popup "Prenota qui" verso il booking reale. Stesso tool,
// niente placeholder. Regola copy: niente trattini lunghi.

export function ScanLocations({ sedi }: { sedi: MapSede[] }) {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <SectionTitle subtitle="Entra nel registro ad alta fedeltà.">La scansione</SectionTitle>
      <div className="max-w-2xl">
        <span className="label-mono text-teal">Le sedi di scansione</span>
        <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Fatti scansionare <GradientFlowText>da un professionista</GradientFlowText>.
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          Ogni punto e una sede certificata sul protocollo SEMBLIC-SCAN: prenoti una sessione
          e il tuo volto entra nel registro come avatar verificato ad alta fedelta.
        </p>
      </div>

      <div className="mt-8">
        <SediMap sedi={sedi} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg"><Link href="/scansione/prenota">Prenota la tua scansione</Link></Button>
        <Button asChild size="lg" variant="secondary"><Link href="/scansione">Come funziona</Link></Button>
      </div>
    </section>
  );
}
