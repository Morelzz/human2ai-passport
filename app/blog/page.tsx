import Link from "next/link";
import Image from "next/image";
import { listPosts } from "@/lib/blog";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  title: "Blog",
  description:
    "AI, diritto d'immagine, consenso e provenienza: la voce di HUMAN2AI sull'era dei volti generati.",
};

// A3 — indice del blog. Gli articoli sono file in content/blog/ (niente CMS):
// aggiungi un file, committa, è online.
export default async function BlogIndexPage() {
  const posts = await listPosts();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="reveal mb-12">
            <span className="label-mono text-violet-light">Il blog</span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Voci sull&apos;era dei <span className="text-gradient">volti generati</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              AI, diritto d&apos;immagine, consenso, provenienza. Quello che sta succedendo
              ai volti umani nell&apos;era generativa, e come tenerli in mani umane.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="reveal text-muted">Primi articoli in arrivo.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {posts.map((p, i) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="reveal glass glass-hover block overflow-hidden rounded-2xl"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Miniatura copertina (se presente) */}
                    {p.cover && (
                      <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56">
                        <Image
                          src={p.cover}
                          alt={p.coverAlt}
                          fill
                          sizes="(max-width: 640px) 100vw, 224px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6 sm:p-8">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.66rem] font-bold tracking-[0.12em] text-faint">
                        <span className="rounded-full border border-violet-light/40 px-3 py-1 uppercase text-violet-light">
                          {p.category}
                        </span>
                        <time dateTime={p.date} className="text-teal">
                          {new Date(p.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
                        </time>
                        {p.tags.slice(0, 2).map((t) => (
                          <span key={t} className="uppercase">· {t}</span>
                        ))}
                      </div>
                      <h2 className="mt-3 text-balance text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
                        {p.title}
                      </h2>
                      <p className="mt-2.5 text-pretty text-sm leading-relaxed text-muted sm:text-base">{p.description}</p>
                      <span className="mt-4 inline-block text-sm font-semibold text-violet-light">Leggi →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
