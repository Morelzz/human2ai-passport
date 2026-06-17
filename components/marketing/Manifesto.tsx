"use client";

import { motion } from "framer-motion";

// [MANIFESTO / VISION] — Il cuore editoriale del sito. Sei principi a tutta
// larghezza, molto respiro, contrasto tipografico massimo. Copy verbatim da
// docs/SITE_COPY.md. Sezione dedicata, non un blocchetto tra gli altri.

type Principle = { n: string; title: string; body: string; color: string };

const PRINCIPLES: Principle[] = [
  {
    n: "01",
    title: "Nessun volto finto.",
    body: "Ogni persona generata su SEMBLIC è reale. Ha un nome, un contratto, un compenso. Non creiamo esseri umani: diamo voce a quelli che esistono e hanno scelto di esserci.",
    color: "#F2A93B",
  },
  {
    n: "02",
    title: "Il permesso viene prima della generazione.",
    body: "Prima di creare un essere umano, chiediamo il permesso a un essere umano. Se nessuna persona reale ha acconsentito, l'AI non produce nulla. È un confine, non un'opzione.",
    color: "#EE7A70",
  },
  {
    n: "03",
    title: "L'ordine si ribalta.",
    body: "Per anni le intelligenze artificiali si sono nutrite di noi senza chiedere. Qui è l'AI a lavorare per le persone, non le persone a essere materia prima dell'AI.",
    color: "#7FAE96",
  },
  {
    n: "04",
    title: "Il tuo volto resta tuo.",
    body: "Concedi, non cedi. Decidi tu dove può apparire e dove no, e puoi revocare quando vuoi. Il consenso non è una firma sola: è una linea del tempo che controlli tu.",
    color: "#F2A93B",
  },
  {
    n: "05",
    title: "Non devi essere un modello. Devi essere reale.",
    body: "Il guadagno passivo dal proprio volto non è più un privilegio di chi sta in copertina. Ogni persona può mettere a reddito la propria immagine, con dignità e con regole chiare.",
    color: "#EE7A70",
  },
  {
    n: "06",
    title: "Ogni immagine porta la sua prova.",
    body: "Ogni contenuto generato esce con la prova certificata di chi c'è dietro. In un mondo che non distingue più il vero dal sintetico, noi rendiamo il vero verificabile.",
    color: "#7FAE96",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Manifesto() {
  return (
    <section id="manifesto" className="relative mx-auto max-w-5xl px-5 py-24 sm:px-8 sm:py-32">
      {/* Intestazione */}
      <div className="mb-14 sm:mb-20">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="label-mono text-crimson-light"
        >
          Il manifesto
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-3 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl lg:text-7xl"
        >
          Il nostro patto
        </motion.h2>
      </div>

      {/* I sei principi, a tutta larghezza */}
      <ol>
        {PRINCIPLES.map((p, i) => (
          <motion.li
            key={p.n}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.65, delay: (i % 2) * 0.05, ease: EASE }}
            className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-white/10 py-9 sm:py-12 md:grid-cols-[5rem_1fr]"
          >
            <span
              className="font-mono text-4xl font-extrabold leading-none sm:text-5xl"
              style={{ color: p.color }}
            >
              {p.n}
            </span>
            <div>
              <h3 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                {p.title}
              </h3>
              <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
                {p.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>

      {/* Chiusura del manifesto: la riga-payoff, grande */}
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="mt-16 border-t border-white/10 pt-14 text-center text-3xl font-extrabold tracking-tight sm:text-5xl"
      >
        <span className="text-gradient">Real Humans. Real Rights. Real Earnings.</span>
      </motion.p>
    </section>
  );
}
