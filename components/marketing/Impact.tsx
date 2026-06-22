// [FRASE D'IMPATTO] — Sostituisce Tension + il Manifesto lungo: una sola riga
// forte tra l'Hero e "Come funziona". Tono dichiarazione, niente fronzoli.
// Regola copy: niente trattini lunghi.

export function Impact() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
      <p className="text-balance text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
        L&apos;AI ha imparato a fabbricare persone.{" "}
        <span className="text-gradient">Noi proteggiamo, e paghiamo, quelle vere.</span>
      </p>
    </section>
  );
}
