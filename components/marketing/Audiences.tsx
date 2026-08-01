"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// [SELLERS] + [BUYERS] — Le due platee, affiancate. Copy verbatim da
// docs/SITE_COPY.md. Sellers = la persona comune (caldo, sobrio); Buyers = i
// brand (sicurezza legale, professionale).

const EASE = [0.22, 1, 0.36, 1] as const;

export function Audiences() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Sellers */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="glass glass-hover relative overflow-hidden rounded-[1.75rem] p-7 sm:p-9"
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_0%_0%,rgba(127,174,150,0.12),transparent_70%)]" />
          <div className="relative">
            <span className="label-mono text-teal">Per chi mette il volto</span>
            <h3 className="mt-2 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Il tuo volto, alle tue condizioni.
            </h3>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              Decidi tu in quali mondi la tua immagine può apparire, e in quali mai.
              Ogni volta che viene usata, guadagni. Ogni volta che cambi idea, comandi tu.
              Niente è venduto. Niente è per sempre. Tutto è tuo.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/signup">Candida il tuo volto</Link>
            </Button>
          </div>
        </motion.div>

        {/* Buyers */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          className="glass glass-hover relative overflow-hidden rounded-[1.75rem] p-7 sm:p-9"
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_100%_0%,rgba(242,169,59,0.14),transparent_70%)]" />
          <div className="relative">
            <span className="label-mono text-violet-light">Per i brand</span>
            <h3 className="mt-2 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Volti che puoi usare senza paura.
            </h3>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              Ogni volto del catalogo è verificato e consenziente, con un consenso esplicito e revocabile.
              Niente cause, niente volti rubati: solo persone vere, con la prova di provenienza
              in ogni contenuto che generi.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7">
              <Link href="/match">Sfoglia il catalogo verificato</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
