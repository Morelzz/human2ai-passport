import type { ReactNode } from "react";

// Una voce di una pagina da leggere (regole, privacy): titolo e testo, con
// l'id che usa l'indice dei Capitoli. Stessa funzione per l'id da tutte e due
// le parti, cosi' l'indice non si stacca mai dalla pagina.
export function idDa(titolo: string): string {
  return titolo
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

// Il titolo breve per l'indice: prima dei due punti, senza parentesi.
export function titoloBreve(titolo: string): string {
  return titolo.split(":")[0].replace(/\s*\(.*?\)\s*/g, " ").trim();
}

export function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section id={idDa(titolo)} className="scroll-mt-28 border-t border-border pt-7 first:border-t-0 first:pt-0">
      <h2 className="max-w-[30ch] text-balance text-[1.45rem] font-bold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[1.9rem]">{titolo}</h2>
      <div className="mt-3 max-w-[68ch] text-[1.02rem] leading-[1.75] text-muted">{children}</div>
    </section>
  );
}
