import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WardDemo } from "./WardDemo";

// Sezione Ward in homepage (#ward): presentazionale, introduce Ward e mostra la
// demo simulata. NON tocca mai dati utente. Va dopo il blocco "Avatars" cosi'
// l'ordine racconta: prima si crea, poi si protegge. CTA -> /signup (la rotta
// reale di ingresso; il deep-link al fork protetto arriva con la sez. 4).
export function WardSection() {
  return (
    <section id="ward" className="w-full py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
        {/* Desktop: la demo a sinistra */}
        <div className="order-1 lg:order-none">
          <WardDemo />
        </div>
        {/* Desktop: il messaggio a destra */}
        <div className="order-2">
          <span className="label-mono text-violet-light">Real humans. Real rights.</span>
          <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            La tua faccia, sorvegliata su tutto il web.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Ward dà la caccia agli usi non autorizzati del tuo volto, conferma ogni ritrovamento e lo rimuove. Protezione per le persone che scelgono di stare su Semblic.
          </p>
          <div className="mt-7">
            <Button asChild size="lg">
              <Link href="/signup">Blinda la tua faccia</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
