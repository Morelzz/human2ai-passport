import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import ReportClient from "./ReportClient";
import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";

interface Props {
  searchParams: Promise<{ handle?: string; cert?: string }>;
}

export const metadata = {
  title: "Segnala un abuso",
  description:
    "Hai visto un volto usato senza consenso? Segnalalo a Semblic: ogni segnalazione apre un flusso di verifica tracciato che può portare alla rimozione.",
  alternates: { canonical: "/report" },
};

// Segnalazione pubblica di abuso — accessibile a chiunque, anche senza account.
export default async function ReportPage({ searchParams }: Props) {
  const { handle, cert } = await searchParams;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        <TestataTesto
          larghezza="max-w-3xl"
          occhiello="Tutela del registro"
          titolo="Segnala un abuso."
          sotto="Se un avatar non rappresenta una persona realmente consenziente, è un'impersonazione, o un contenuto è stato usato senza consenso, segnalalo. Una persona del team legge ogni segnalazione e, se accolta, l'avatar esce dal registro pubblico."
          dato="letta da una persona"
        />
        <main className="mx-auto max-w-3xl px-5 pb-14 sm:px-8">
          <ReportClient initialHandle={handle ?? ""} initialCert={cert ?? ""} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
