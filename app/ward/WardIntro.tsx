import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    d: "Ogni ritrovamento ha un semaforo per dominio (zona nota o zona nascosta) e la lettura della filigrana invisibile, che conferma quando una copia e' davvero tua. Nessuna accusa automatica, nessuna cifra.",
  },
  {
    k: "Decidi tu",
    d: "Segna sicuro le copie che vanno bene (spariscono dai risultati) e avvia la rimozione su quelle che contano. Il comando resta sempre tuo.",
  },
];

export function WardIntro() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <span className="label-mono text-violet-light">Ward</span>
      <h1 className="mt-4 text-balance text-4xl font-extralight leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl">
        Le tue immagini,
        <br />
        trovate ovunque.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
        Ward cerca sul web le copie delle immagini che generi su Semblic. Le trova, le tagga e decidi tu cosa fare.{" "}
        <span className="text-foreground">Niente foto da caricare, niente consenso:</span> Ward lavora sulle immagini che gia' possiedi.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/account">Vai alle tue creazioni</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/ward/demo">Guarda la demo</Link>
        </Button>
      </div>
      <p className="mt-4 text-sm text-faint">
        Apri una tua immagine generata e premi <span className="text-muted">&ldquo;Cerca copie sul web&rdquo;</span>.
      </p>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.k} className="bg-obsidian-2 p-6">
            <div className="font-mono text-xs text-violet-light">0{i + 1}</div>
            <h2 className="mt-3 text-lg font-semibold text-foreground">{s.k}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 max-w-xl text-sm leading-relaxed text-faint">
        Cerchi invece di non essere generabile dalle AI? Quella e' la{" "}
        <Link href="/tutela" className="text-violet-light underline-offset-2 hover:underline">
          protezione identita&apos;
        </Link>
        , una cosa diversa: registri il tuo volto per restare fuori dal generativo.
      </p>
    </div>
  );
}
