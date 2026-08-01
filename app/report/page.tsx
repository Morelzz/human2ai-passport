import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import ReportClient from "./ReportClient";

interface Props {
  searchParams: Promise<{ handle?: string; cert?: string }>;
}

export const metadata = {
  title: "Segnala un abuso",
  description:
    "Hai visto un volto usato senza consenso? Segnalalo a Semblic: verifichiamo e interveniamo.",
};

// Segnalazione pubblica di abuso — accessibile a chiunque, anche senza account.
export default async function ReportPage({ searchParams }: Props) {
  const { handle, cert } = await searchParams;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-xl px-5 py-14 sm:px-8">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-[0.14em] text-crimson">ENFORCEMENT</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Segnala un abuso</h1>
            <p className="mt-3 leading-relaxed text-muted">
              Se un avatar non rappresenta una persona realmente consenziente, è un&apos;<span className="text-foreground">impersonazione</span>,
              o un contenuto è stato usato fuori dalle categorie concesse, segnalalo. Gli operatori revisionano
              ogni segnalazione e, se accolta, l&apos;avatar viene rimosso dal registro pubblico.
            </p>
          </div>
          <ReportClient initialHandle={handle ?? ""} initialCert={cert ?? ""} />
        </main>
      </div>
    </div>
  );
}
