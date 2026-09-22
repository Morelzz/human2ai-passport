import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { ProvaGratis, type VoltoProva } from "@/components/marketing/ProvaGratis";
import { registroPubblico } from "@/lib/registro-cache";
import { provaAttiva, voltiPerLaProva } from "@/lib/prova-gratis";
import { portraitFor } from "@/lib/sample-galleries";
import { sampleSrc } from "@/lib/sample-size";

export const metadata = {
  title: "Provalo senza registrarti",
  description: "Scegli una persona vera del registro e una scena: in meno di un minuto hai la tua foto, col certificato che dice chi c'è dentro e cosa ha autorizzato.",
  alternates: { canonical: "/prova" },
};

// LA PAGINA DELLA PROVA. Esiste solo quando l'interruttore e' acceso: spenta,
// non c'e' nemmeno l'indirizzo (404). E' la porta per chi non ci conosce: le
// campagne oggi portano a /inizia e /compra, questa e' la terza.
export default async function ProvaPage() {
  if (!provaAttiva()) notFound();

  const registro = await registroPubblico();
  const volti: VoltoProva[] = voltiPerLaProva(registro as unknown as Parameters<typeof voltiPerLaProva>[0], 4).map((a) => {
    const r = a as unknown as { handle: string; alias: string };
    return { handle: r.handle, alias: r.alias, src: sampleSrc(portraitFor(r as never), 480) };
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <ProvaGratis volti={volti} />

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Spiega t="Perché è gratis" d="Perché il modo più veloce per spiegare Semblic è farlo vedere. La prova la paghiamo noi, compresa la quota della persona nella foto: se un utilizzo non paga, la nostra frase più importante smette di essere vera." />
          <Spiega t="Perché le scene sono solo sei" d="Perché su un volto vero non si scrive quello che si vuole senza nemmeno un account. Le sei scene sono nostre e sono innocue. Dentro l'account scrivi la scena che vuoi, con le regole del consenso." />
          <Spiega t="Perché c'è la filigrana" d="Perché una prova è una prova. La stessa foto, pulita e in alta, esce dall'account insieme al kit dei formati e alla liberatoria da allegare alla campagna." />
        </div>

        <div className="card mt-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[1.15rem] font-bold tracking-[-0.02em]">Il tuo volto potrebbe essere qui</p>
            <p className="mt-1 max-w-[56ch] text-[0.92rem] leading-relaxed text-muted">
              Ogni persona del registro ha firmato il consenso, decide cosa concedere e incassa a ogni utilizzo. Anche su una prova come questa.
            </p>
          </div>
          <Link href="/signup/avatar" className="shrink-0 rounded-full bg-amber px-5 py-3 text-center text-[0.9rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
            Entra nel registro
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Spiega({ t, d }: { t: string; d: string }) {
  return (
    <div className="card p-5">
      <p className="text-[1.02rem] font-bold tracking-[-0.02em]">{t}</p>
      <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">{d}</p>
    </div>
  );
}
