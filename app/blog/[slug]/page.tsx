import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, listPosts } from "@/lib/blog";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

// A3 — pagina articolo. Il corpo è markdown renderizzato server-side da file
// nel repo (contenuto fidato). SEO per-articolo via generateMetadata.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Articolo non trovato" };
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const others = (await listPosts()).filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
          {/* Testata */}
          <header className="reveal mb-10">
            <Link href="/blog" className="font-mono text-[0.7rem] font-bold tracking-[0.12em] text-faint transition-colors hover:text-muted">
              ← IL BLOG
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.66rem] font-bold tracking-[0.12em] text-faint">
              <time dateTime={post.date} className="text-teal">
                {new Date(post.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
              </time>
              {post.tags.map((t) => (
                <span key={t} className="uppercase">· {t}</span>
              ))}
            </div>
            <h1 className="mt-4 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-[2.6rem]">
              {post.title}
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">{post.description}</p>
            <p className="mt-4 text-sm text-faint">di {post.author}</p>
            <hr className="divider-glow mt-8" />
          </header>

          {/* Corpo (markdown renderizzato; contenuto fidato dal repo) */}
          <div className="prose-h2ai reveal" dangerouslySetInnerHTML={{ __html: post.html }} />

          {/* Chiusura: CTA registro + altri articoli */}
          <footer className="mt-14">
            <hr className="divider-glow" />
            <div className="glass mt-8 rounded-2xl p-6 text-center sm:p-8">
              <p className="text-balance text-lg font-bold">Ogni volto generato deve avere una persona vera dietro.</p>
              <Link href="/match" className="mt-4 inline-block rounded-xl bg-[linear-gradient(135deg,#6B21E8,#B8005C)] px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-110">
                Esplora il Registro Volti
              </Link>
            </div>
            {others.length > 0 && (
              <div className="mt-10">
                <span className="label-mono text-violet-light">Continua a leggere</span>
                <div className="mt-4 flex flex-col gap-3">
                  {others.map((p) => (
                    <Link key={p.slug} href={`/blog/${p.slug}`} className="glass glass-hover block rounded-xl p-5">
                      <span className="block text-sm font-bold">{p.title}</span>
                      <span className="mt-1 block text-xs text-muted">{p.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}
