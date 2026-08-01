import { User } from "lucide-react";

// Sezione "team / docenti" condivisa: la usano Academy ("I docenti") e Contatti
// ("Chi siamo"). Tre slot fatti bene, con foto/nome/ruolo. I contenuti veri
// (nomi, ruoli, foto) arrivano dopo: per ora placeholder marcati col pattern del
// codebase ("[da completare]"), cosi' la struttura e' pronta e si riempie senza
// ritoccare il layout. Lo slot 3 e' volutamente "in arrivo".

type Member = {
  name: string;
  role: string;
  bio: string;
  accent: string;
  photo?: string | null; // url ritratto quando disponibile
  todo?: boolean; // nome ancora da confermare
  soon?: boolean; // posto in arrivo
};

// Tre figure: il founder e due slot in arrivo (foto del founder da inserire).
const MEMBERS: Member[] = [
  { name: "Riccardo Tirincanti", role: "Founder", accent: "#F2A93B",
    bio: "Fondatore di Semblic e dello standard SEMBLIC-SCAN. Guida la visione del registro dei diritti d'immagine." },
  { name: "In arrivo", role: "Docente", accent: "#7FAE96", soon: true,
    bio: "Terra' i percorsi su consenso, provenienza e tutela dell'identita nell'era generativa." },
  { name: "In arrivo", role: "Docente", accent: "#EE7A70", soon: true,
    bio: "Una nuova figura si unisce presto al team dei docenti." },
];

export function TeamSection({
  eyebrow = "Il team",
  title = "Le persone dietro Semblic",
  subtitle,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="text-center">
        <span className="label-mono text-teal">{eyebrow}</span>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">{subtitle}</p>}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {MEMBERS.map((m, i) => (
          <div key={i} className="glass glass-hover relative flex flex-col items-center overflow-hidden rounded-[2rem] p-7 text-center">
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${m.accent}, transparent)` }} />

            {/* Ritratto: foto quando c'e', altrimenti silhouette su alone */}
            <div className="relative h-24 w-24 overflow-hidden rounded-full border" style={{ borderColor: `${m.accent}55`, background: `radial-gradient(120% 120% at 30% 20%, ${m.accent}22, transparent 70%)` }}>
              {m.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center" style={{ color: `${m.accent}` }}>
                  <User className="h-9 w-9" style={{ opacity: m.soon ? 0.45 : 0.8 }} />
                </span>
              )}
            </div>

            <div className="mt-5">
              <span className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ background: `${m.accent}1a`, color: m.accent }}>
                {m.role}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold leading-tight">{m.name}</h3>
            {m.todo && <p className="mt-0.5 font-mono text-[0.62rem] text-faint">[da completare]</p>}
            <p className="mt-3 text-sm leading-relaxed text-muted">{m.bio}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
