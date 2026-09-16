"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Lista articoli con FILTRO per categoria. Le categorie canoniche sono fisse
// (Politica, Tecnologia, Regolamentazione, Industria, Societa), piu' "Tutte".
// Un articolo con categoria fuori lista resta comunque visibile sotto "Tutte".
// Match case-insensitive sul campo category dell'articolo.

export type BlogCard = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  tags: string[];
  cover?: string | null;
  coverAlt?: string;
};

const CATEGORIES = ["Politica", "Tecnologia", "Regolamentazione", "Industria", "Finanza", "Società"];

export function BlogList({ posts }: { posts: BlogCard[] }) {
  const [active, setActive] = useState<string>("Tutte");

  const norm = (s: string) => s.trim().toLowerCase().replace(/à/g, "a");
  const shown = active === "Tutte" ? posts : posts.filter((p) => norm(p.category) === norm(active));

  // Mostro solo le chip che hanno almeno un articolo, piu' "Tutte". Cosi' il
  // filtro non promette categorie vuote.
  const available = CATEGORIES.filter((c) => posts.some((p) => norm(p.category) === norm(c)));
  const chips = ["Tutte", ...available];

  return (
    <>
      {chips.length > 1 && (
        <div className="reveal riga-scorrevole -mx-5 mb-8 px-5 sm:mx-0 sm:flex sm:flex-wrap sm:gap-2 sm:px-0">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active === c ? "bg-amber text-on-amber" : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-muted">Niente articoli in questa categoria, per ora.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {shown.map((p, i) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="reveal card transition-colors hover:border-amber/60 block overflow-hidden rounded-2xl"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="flex flex-col sm:flex-row">
                {p.cover && (
                  <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56">
                    <Image src={p.cover} alt={p.coverAlt ?? p.title} fill sizes="(max-width: 640px) 100vw, 224px" className="object-cover" />
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.66rem] font-bold tracking-[0.12em] text-faint">
                    <span className="rounded-full border border-amber/50 px-3 py-1 uppercase text-amber-ink">{p.category}</span>
                    <time dateTime={p.date} className="text-verified">
                      {new Date(p.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
                    </time>
                    {p.tags.slice(0, 2).map((t) => (
                      <span key={t} className="uppercase">· {t}</span>
                    ))}
                  </div>
                  <h2 className="mt-3 text-balance text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{p.title}</h2>
                  <p className="mt-2.5 text-pretty text-sm leading-relaxed text-muted sm:text-base">{p.description}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-amber-ink">Leggi &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
