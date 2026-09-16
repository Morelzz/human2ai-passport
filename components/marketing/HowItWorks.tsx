import { SectionTitle } from "@/components/marketing/SectionTitle";

// [COME FUNZIONA], casa nuova: tre card chiare, numerate perche' l'ordine e'
// un processo vero (persona, filtro, valore). Copy verbatim da SITE_COPY.
// Niente pin allo scroll (17/9/2026): la sezione restava ferma per quasi due
// schermate con tre card piccole e mezzo schermo vuoto. Ora le card entrano
// una dopo l'altra con l'animazione legata allo scroll del browser (.sv), senza
// JavaScript; con "riduci animazioni" sono ferme e subito visibili.

const STEPS = [
  { n: "01", k: "La persona", t: "Una persona reale entra.", d: "Viene verificata, firma il proprio consenso e sceglie dove la sua immagine può vivere." },
  { n: "02", k: "Il filtro", t: "Una richiesta arriva.", d: "Il sistema cerca una persona reale che ha acconsentito. Se non la trova, non genera. Punto." },
  { n: "03", k: "Il valore", t: "Il valore torna alla persona.", d: "A ogni utilizzo, chi ha messo il volto guadagna. Il valore creato dall'AI torna all'essere umano da cui nasce." },
];

export function HowItWorks() {
  return (
    <section id="come-funziona" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-20 sm:px-8 sm:pt-24">
      <div className="sv">
        <SectionTitle kicker="In tre passi">Come funziona</SectionTitle>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className="card sv flex flex-col gap-3.5 p-6 sm:p-7"
            // su desktop le tre card entrano in scala, una dopo l'altra
            style={{ animationRange: `entry ${i * 10}% entry ${40 + i * 10}%` }}
          >
            <span className="kicker self-start rounded-full bg-amber-soft px-2.5 py-1.5 text-[0.62rem]">{s.n} · {s.k}</span>
            <h3 className="text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">{s.t}</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
