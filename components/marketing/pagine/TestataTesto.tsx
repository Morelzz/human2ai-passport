import type { ReactNode } from "react";

// ──────────────────────────────────────────────────────────────────────────
// LA TESTATA DELLE PAGINE DI TESTO (27/9/2026, notte). Per le pagine che si
// leggono (regole, trasparenza, FAQ): niente foto e niente parola arancione nel
// titolo. Titolo grande a sinistra, un filo che si accende e i dati della
// pagina in caratteri da strumento (cosa e', quando e' stata aggiornata).
// ──────────────────────────────────────────────────────────────────────────

export function TestataTesto({
  occhiello,
  titolo,
  sotto,
  azioni,
  dato,
  children,
  larghezza = "max-w-[1380px]",
}: {
  occhiello: string;
  titolo: ReactNode;
  sotto?: ReactNode;
  azioni?: ReactNode;
  dato?: string; // es. "aggiornata il 27.09.2026"
  children?: ReactNode; // qualcosa sotto, a tutta larghezza (numeri, strumenti)
  larghezza?: string; // la stessa colonna del contenuto sotto, cosi' titolo e testo partono dallo stesso filo
}) {
  return (
    <section className={`mx-auto w-full ${larghezza} px-5 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-16`}>
      <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-faint sm:text-[0.72rem]">
        <span className="text-amber-ink">{occhiello}</span>
        <span aria-hidden className="testata-filo h-px flex-1 bg-edge" />
        {dato && <span className="hidden sm:inline">{dato}</span>}
      </div>
      <h1 className={`mt-6 max-w-[17ch] text-balance text-[2.6rem] font-bold leading-[0.95] tracking-[-0.05em] sm:text-[4rem] ${larghezza.includes("1380") ? "lg:text-[5.4rem]" : "lg:text-[4.4rem]"}`}>{titolo}</h1>
      {sotto && <div className="mt-5 max-w-[60ch] text-pretty text-[1.05rem] leading-relaxed text-muted sm:text-[1.2rem]">{sotto}</div>}
      {azioni && <div className="mt-7 flex flex-wrap items-center gap-3">{azioni}</div>}
      {dato && <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-faint sm:hidden">{dato}</p>}
      {children && <div className="mt-10 sm:mt-14">{children}</div>}
    </section>
  );
}
