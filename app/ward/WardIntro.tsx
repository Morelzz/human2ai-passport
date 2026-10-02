import Link from "next/link";
import { Copertina } from "@/components/marketing/pagine/Copertina";
import type { CopertinaPagina } from "@/lib/foto-pagine";
import { NemesisMark } from "./NemesisMark";

// Gradiente "tramonto" (amber->coral) = identita di Nemesis, lo strike.
const TRAMONTO = "linear-gradient(135deg,#F2A93B 0%,#EE7A70 100%)";
const wordmark = { background: TRAMONTO, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as const;

// /ward (Ward v2) — pagina di SPIEGAZIONE del finder, pubblica. Ward v2 trova le
// COPIE delle immagini che generi su Semblic: niente foto da caricare, niente
// consenso, niente KYC. Si usa per-immagine dalle tue creazioni (/account ->
// "Cerca copie sul web"). Questa pagina racconta cosa fa e ti manda li'.

const STEPS = [
  {
    k: "Trova le copie",
    d: "Ward cerca su tutto il web le copie delle immagini che hai generato, partendo dall'immagine stessa (reverse image), non dal tuo volto.",
  },
  {
    k: "Le tagga, non le giudica",
    d: "Ogni ritrovamento ha un semaforo per dominio (zona nota o zona nascosta) e la lettura della filigrana invisibile, che conferma quando una copia è davvero tua. Nessuna accusa automatica, nessuna cifra.",
  },
  {
    k: "Decidi tu",
    d: "Segna sicuro le copie che vanno bene (spariscono dai risultati) e, sulle copie confermate, avvii Nemesis. Il comando resta sempre tuo.",
  },
];

export function WardIntro({ copertina }: { copertina: CopertinaPagina | null }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground">
        <span aria-hidden className="text-lg leading-none">&lsaquo;</span> Indietro
      </Link>

      <div className="-mx-5 mt-5 sm:-mx-8">
        <Copertina
          copertina={copertina}
          occhiello="Ward, il finder"
          titolo="Le tue immagini, trovate ovunque."
          sotto={
            <>
              Ward cerca sul web le copie delle immagini che generi su Semblic. Le trova, le tagga e decidi tu cosa fare.
              Niente foto da caricare, niente consenso: lavora sulle immagini che già possiedi.
              <span className="mt-3 block text-[0.92rem] text-white/55">Apri una tua immagine generata e premi «Cerca copie sul web».</span>
            </>
          }
          azioni={<Link href="/account" className="inline-flex h-12 items-center rounded-full bg-amber px-6 text-[0.98rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">Vai alle tue creazioni</Link>}
        />
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.k} className="bg-surface p-6">
            <div className="font-mono text-xs text-amber-ink">0{i + 1}</div>
            <h2 className="mt-3 text-lg font-semibold text-foreground">{s.k}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>

      {/* NEMESIS: lo strike. Ward trova, Nemesis colpisce. */}
      <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8" style={{ borderColor: "rgba(238,122,112,0.25)" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[#2a1404]" style={{ background: TRAMONTO }}>
            <NemesisMark className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-bold tracking-[0.18em]" style={wordmark}>NEMESIS</div>
            <div className="text-xs text-muted">Ward trova, Nemesis colpisce.</div>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Quando una copia è <span className="text-foreground">confermata tua</span>, Nemesis prepara una richiesta di rimozione (DMCA) già pronta, con l&apos;indirizzo a cui inviarla e le prove allegate.{" "}
          <span className="text-foreground">Semblic prepara, tu invii:</span> nessun invio automatico, nessuna accusa. Poi segui lo stato, dalla bozza alla copia rimossa. Solo sulle copie confermate, il comando resta tuo.
        </p>
      </div>

      <p className="mt-10 max-w-xl text-sm leading-relaxed text-faint">
        Cerchi invece di non essere generabile dalle AI? Quella è la{" "}
        <Link href="/tutela" className="text-amber-ink underline underline-offset-2 hover:no-underline">
          protezione identità
        </Link>
        , una cosa diversa: registri il tuo volto per restare fuori dal generativo.
      </p>
    </div>
  );
}
