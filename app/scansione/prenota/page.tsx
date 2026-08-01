import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { getSedi, SCAN_PRICE_CENTS, SCAN_PRICE_LABEL_SUFFIX } from "@/lib/scan";
import { formatEur } from "@/lib/wallet";
import { BookingClient } from "./BookingClient";

export const metadata = {
  title: "Prenota la tua scansione",
  description:
    "Prenota la sessione di scansione SEMBLIC-SCAN: una sessione fotografica professionale, il tuo passaporto pubblico, il tuo volto che lavora alle tue condizioni.",
  alternates: { canonical: "/scansione/prenota" },
};

// H2 — booking della scansione. Sede preselezionabile via ?sede=<slug>
// (è l'aggancio dei pin della mappa H4). Prezzo da lib/scan (fonte unica).
export default async function PrenotaPage({ searchParams }: { searchParams: Promise<{ sede?: string; esito?: string }> }) {
  const { sede: sedeParam, esito } = await searchParams;
  const sedi = (await getSedi()).filter((s) => s.status === "attiva" && s.booking_enabled);
  const priceLabel = `${formatEur(SCAN_PRICE_CENTS)} · ${SCAN_PRICE_LABEL_SUFFIX}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
          <span className="label-mono text-teal">Prenotazione</span>
          <h1 className="mt-3 text-balance text-3xl font-extrabold leading-[1.06] tracking-tight sm:text-4xl">
            Prenota la tua scansione
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Una sessione professionale secondo lo standard{" "}
            <Link href="/scansione#standard" className="text-violet-light underline-offset-2 hover:underline">SEMBLIC-SCAN</Link>:
            circa cento scatti in pochi minuti, la selezione e la lavorazione le facciamo noi.
            Tu devi solo <span className="text-foreground">essere te</span>.
          </p>

          {/* Prezzo, in chiaro */}
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-violet/25 bg-violet/[0.07] px-5 py-4">
            <span className="text-3xl font-extrabold">{formatEur(SCAN_PRICE_CENTS)}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-violet-light">{SCAN_PRICE_LABEL_SUFFIX.toUpperCase()}</p>
              <p className="text-xs leading-snug text-faint">Sessione completa + postproduzione + ingresso nel registro. Si salda in studio.</p>
            </div>
          </div>

          {esito === "ok" && (
            <div className="mt-6 rounded-2xl border border-teal/30 bg-teal/10 p-5 text-sm font-semibold text-teal">
              ✓ Pagamento ricevuto. Sessione confermata. Ti aspettiamo, e ricorda: vieni come sei.
            </div>
          )}
          {esito === "annullato" && (
            <div className="mt-6 rounded-2xl border border-border bg-white/[0.03] p-5 text-sm text-muted">
              Pagamento annullato: la tua richiesta resta valida, puoi saldare in studio o riprovare.
            </div>
          )}

          <div className="glass mt-8 rounded-[2rem] p-6 sm:p-8">
            <BookingClient
              sedi={sedi.map((s) => ({ slug: s.slug, name: s.name, city: s.city }))}
              priceLabel={formatEur(SCAN_PRICE_CENTS)}
              initialSede={sedeParam}
            />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-faint">
            Prima della sessione: <Link href="/scansione" className="text-violet-light underline">come prepararti</Link> ·
            cosa succede dopo: selezione foto → creazione avatar → ingresso nel registro → il tuo passaporto pubblico.
          </p>
        </main>
      </div>
    </div>
  );
}
