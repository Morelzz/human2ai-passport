import Link from "next/link";
import type { ReactNode } from "react";
import type { CopertinaPagina } from "@/lib/foto-pagine";
import { formatEur } from "@/lib/wallet";

// ──────────────────────────────────────────────────────────────────────────
// LA COPERTINA DI UNA PAGINA (27/9/2026, notte). Al posto della testata
// centrata con la parola arancione (uguale su venti pagine), ogni pagina apre
// su uno scatto VERO di Semblic, nella lingua della prima pagina: set al buio,
// titolo grande in basso a sinistra, la lente sul volto e il cartellino del
// certificato con i numeri veri (quanto e' costato, quanto e' andato alle
// persone). Il cartellino porta a Sigil: la prova si controlla.
//
// Due tagli: "piena" per le foto orizzontali (tutto lo schermo), "lato" per le
// verticali e quadrate (testo a sinistra, foto a destra; sul telefono la foto
// sopra). Senza copertina (consenso revocato o lettura non riuscita) resta il
// set al buio con la griglia: la pagina non si rompe.
// Server component, niente JavaScript: le animazioni sono CSS e si fermano con
// "riduci animazioni".
// ──────────────────────────────────────────────────────────────────────────

function nomi(lista: string[]): string {
  if (lista.length <= 1) return lista[0] ?? "";
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

export function Cartellino({ copertina, chiaro = false }: { copertina: CopertinaPagina; chiaro?: boolean }) {
  const chi = nomi(copertina.persone.map((p) => p.alias));
  return (
    <Link
      href={`/verify?token=${encodeURIComponent(copertina.certificato)}`}
      className={`group inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] leading-none backdrop-blur-md transition-colors sm:text-[12px] ${
        chiaro ? "border-black/10 bg-white/70 text-[#17150F] hover:border-[#E29A2E]" : "border-white/15 bg-[#0E0C09]/55 text-white/80 hover:border-[#E29A2E]/70 hover:text-white"
      }`}
      aria-label={`Scatto certificato ${copertina.certificato.slice(0, 12)} con ${chi}: verificalo con Sigil`}
    >
      <i aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3DDC97] shadow-[0_0_8px_#3DDC97]" />
      <span className="truncate">
        certificato {copertina.certificato.slice(0, 8)} <span className="opacity-50">|</span> {chi}{" "}
        <span className="opacity-50">|</span> {formatEur(copertina.grossCents)}, {formatEur(copertina.royaltyCents)} a {copertina.persone.length > 1 ? "loro" : copertina.persone[0]?.alias}
      </span>
    </Link>
  );
}

// La lente sta sul volto: il fuoco della foto e' il centro del viso (in %).
function Angoli({ fuoco, largo }: { fuoco: string; largo: boolean }) {
  const [x, y] = fuoco.split(" ").map((v) => parseFloat(v));
  const w = largo ? 15 : 30, h = largo ? 26 : 24;
  return (
    <span
      aria-hidden
      className={`copertina-lente pointer-events-none absolute ${largo ? "max-sm:hidden" : ""}`}
      style={{ left: `${(x || 50) - w / 2}%`, top: `${Math.max(4, (y || 30) - h / 2)}%`, width: `${w}%`, height: `${h}%` }}
    >
      <i className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-[#3DDC97]/80" />
      <i className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-[#3DDC97]/80" />
      <i className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-[#3DDC97]/80" />
      <i className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-[#3DDC97]/80" />
    </span>
  );
}

function Foto({ copertina, priorita, sizes, classe }: { copertina: CopertinaPagina; priorita: boolean; sizes: string; classe: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={copertina.src960}
      srcSet={`${copertina.src960} 960w, ${copertina.src1600} 1600w`}
      sizes={sizes}
      alt={`Scatto certificato su Semblic con ${nomi(copertina.persone.map((p) => p.alias))}`}
      width={copertina.larghezza}
      height={copertina.altezza}
      loading={priorita ? "eager" : "lazy"}
      fetchPriority={priorita ? "high" : "auto"}
      decoding="async"
      className={classe}
      style={{ objectPosition: copertina.fuoco }}
    />
  );
}

export function Copertina({
  copertina,
  occhiello,
  titolo,
  sotto,
  azioni,
  taglio,
  lente = true,
  bassa = false,
}: {
  copertina: CopertinaPagina | null;
  occhiello: string;
  titolo: ReactNode;
  sotto?: ReactNode;
  azioni?: ReactNode;
  taglio?: "piena" | "lato";
  lente?: boolean;
  bassa?: boolean; // pagine da usare subito (il registro): la foto non prende tutto lo schermo
}) {
  const t = taglio ?? (copertina && copertina.larghezza > copertina.altezza ? "piena" : "lato");

  const testo = (
    <>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#E29A2E]">{occhiello}</p>
      <h1 className="mt-3 max-w-[16ch] text-balance text-[2.5rem] font-bold leading-[0.95] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.9rem]">{titolo}</h1>
      {sotto && <div className="mt-4 max-w-[52ch] text-pretty text-[1rem] leading-relaxed text-white/75 sm:text-[1.15rem]">{sotto}</div>}
      {azioni && <div className="mt-7 flex flex-wrap items-center gap-3">{azioni}</div>}
    </>
  );

  if (t === "piena" && copertina) {
    return (
      <section data-theme="dark" className="copertina relative mx-3 mt-3 overflow-hidden rounded-[28px] bg-[#0E0C09] text-[#F4EEE3] sm:mx-4">
        <div className={`relative flex flex-col justify-end ${bassa ? "min-h-[min(600px,78svh)] lg:min-h-[min(620px,70svh)]" : "min-h-[max(560px,calc(100svh-6rem))] lg:min-h-[min(860px,calc(100svh-6rem))]"}`}>
          <Foto copertina={copertina} priorita sizes="100vw" classe="copertina-foto absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,12,9,0.96)_0%,rgba(14,12,9,0.7)_32%,rgba(14,12,9,0.1)_62%,rgba(14,12,9,0.35)_100%)]" />
          {lente && <Angoli fuoco={copertina.fuoco} largo />}
          <span aria-hidden className="copertina-riga" />
          <div className="absolute right-4 top-4 z-[1] max-w-[calc(100%-2rem)] sm:right-6 sm:top-6">
            <Cartellino copertina={copertina} />
          </div>
          <div className="relative px-5 pb-9 pt-40 sm:px-10 sm:pb-12 lg:px-14 lg:pb-16">{testo}</div>
        </div>
      </section>
    );
  }

  return (
    <section data-theme="dark" className="copertina relative mx-3 mt-3 overflow-hidden rounded-[28px] bg-[#0E0C09] text-[#F4EEE3] sm:mx-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(rgba(244,238,227,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(244,238,227,0.045) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_80%_30%,rgba(226,154,46,0.15),transparent_70%)]" />
      <div className={`relative grid gap-0 ${copertina ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" : ""}`}>
        {copertina && (
          <div className="relative order-1 aspect-[4/5] max-h-[62svh] w-full overflow-hidden sm:aspect-[16/10] lg:order-2 lg:aspect-auto lg:max-h-none lg:min-h-[min(820px,calc(100svh-6rem))]">
            <Foto copertina={copertina} priorita sizes="(min-width: 1024px) 45vw, 100vw" classe="copertina-foto absolute inset-0 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,12,9,0.9)_0%,rgba(14,12,9,0)_40%)] lg:bg-[linear-gradient(to_right,rgba(14,12,9,0.85)_0%,rgba(14,12,9,0)_35%)]" />
            {lente && <Angoli fuoco={copertina.fuoco} largo={false} />}
            <span aria-hidden className="copertina-riga" />
            <div className="absolute bottom-4 left-4 right-4 z-[1] lg:bottom-6 lg:left-auto lg:right-6">
              <Cartellino copertina={copertina} />
            </div>
          </div>
        )}
        <div className={`relative order-2 flex flex-col justify-end px-5 pb-10 sm:px-10 sm:pb-12 lg:order-1 lg:px-14 lg:pb-16 ${copertina ? "pt-6 lg:pt-28" : "min-h-[min(560px,70svh)] pt-24"}`}>
          {testo}
        </div>
      </div>
    </section>
  );
}
