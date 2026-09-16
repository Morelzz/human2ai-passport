import Link from "next/link";
import { Button } from "@/components/ui/button";

// [WARD E NEMESIS], casa nuova: un'ISOLA SCURA nella pagina chiara. A sinistra
// il messaggio, a destra la scheda del finder come la vede chi ha generato
// un'immagine: copie trovate, semaforo per reputazione del dominio, e il
// tasto Nemesis solo sulle copie confermate. La scheda e' un ESEMPIO
// dichiarato, non tocca mai dati utente.
const ESEMPIO = [
  { host: "instagram.com", nota: "Copia esatta, filigrana presente", tono: "g", quando: "ieri" },
  { host: "forum-immagini.net", nota: "Copia parziale, zona poco conosciuta", tono: "r", quando: "3 gg" },
  { host: "pinterest.com", nota: "Copia esatta, segnata sicura da te", tono: "g", quando: "7 gg" },
] as const;

function Mirino() {
  return (
    <span aria-hidden className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-amber">
      <span className="absolute h-[42px] w-px bg-amber/50" />
      <span className="absolute w-[42px] h-px bg-amber/50" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber" />
    </span>
  );
}

export function WardSection() {
  return (
    <section id="ward" className="mx-auto max-w-7xl px-3 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div
        data-theme="dark"
        className="isola grid gap-8 px-5 py-8 sm:px-12 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:px-16"
        style={{ background: "radial-gradient(60% 70% at 100% 100%, rgba(226,154,46,0.16), transparent 60%), #0C0F17" }}
      >
        <div className="flex flex-col justify-center gap-5">
          <div className="flex items-center gap-3.5">
            <Mirino />
            <span className="kicker">Ward e Nemesis</span>
          </div>
          <h2 className="text-balance text-[2.1rem] font-bold leading-[1] tracking-[-0.035em] sm:text-[3.1rem]">
            Ward trova le copie. Nemesis le rimuove.
          </h2>
          <p className="max-w-[46ch] text-pretty text-[1.02rem] leading-relaxed text-muted">
            Le tue immagini generate vengono cercate su tutto il web. Ward non giudica: mostra dove sono e ti lascia decidere.
            Nemesis prepara la rimozione, solo sulle copie confermate, e la mandi tu.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/ward">Scopri Ward</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/signup/avatar/protected">Proteggi il tuo volto</Link></Button>
          </div>
        </div>

        <div aria-label="Esempio di scheda del finder" className="flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="h-[92px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/sample/gabriella/2" alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0">
              <span className="kicker text-[0.6rem] text-faint">Immagine generata · certificato</span>
              <p className="mt-1.5 text-[1.05rem] font-semibold leading-tight">3 copie trovate, 1 già sicura</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {ESEMPIO.map((r) => (
              <li key={r.host} className="flex items-center gap-3 rounded-[14px] bg-elevated px-3.5 py-3">
                <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.tono === "g" ? "bg-[#E5B040]" : "bg-[#E24B4A]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold">{r.host}</p>
                  <p className="text-[0.78rem] text-muted">{r.nota}</p>
                </div>
                <span className="font-mono text-[0.7rem] text-faint">{r.quando}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-[0.85rem] text-muted">1 copia confermata pronta da rimuovere</span>
            <Button asChild size="sm"><Link href="/ward">Nemesis</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
