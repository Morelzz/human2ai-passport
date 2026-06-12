import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPost, listPosts } from "@/lib/blog";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { ShareBar } from "../ShareBar";
import { siteUrl } from "@/lib/site";

// A3 — pagina articolo. Il corpo è markdown renderizzato server-side da file
// nel repo (contenuto fidato). SEO per-articolo via generateMetadata.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Articolo non trovato" };
  const ogImages = post.cover ? [{ url: post.cover, alt: post.coverAlt }] : undefined;
  return {
    title: post.title,
    description: post.description,
    // Keywords per-articolo (i tag) + categoria: segnali espliciti per i motori.
    keywords: [...post.tags, post.category, "Human2AI", "intelligenza artificiale"],
    // URL canonico: evita contenuti duplicati (con/senza query string, ecc.).
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      section: post.category,
      tags: post.tags,
      images: ogImages,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: post.cover ? [post.cover] : undefined },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const others = (await listPosts()).filter((p) => p.slug !== slug).slice(0, 2);

  // Dati strutturati schema.org: è ciò che Google legge per capire l'articolo
  // (autore, data, immagine, categoria). Requisito per rich result e Discover.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "it-IT",
    articleSection: post.category,
    keywords: post.tags.join(", "),
    image: post.cover ? [post.cover] : undefined,
    mainEntityOfPage: `${siteUrl()}/blog/${post.slug}`,
    author: { "@type": "Organization", name: "HUMAN2AI", url: siteUrl() },
    publisher: {
      "@type": "Organization",
      name: "HUMAN2AI",
      url: siteUrl(),
      logo: { "@type": "ImageObject", url: `${siteUrl()}/logo-shield.png` },
    },
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
          {/* Testata */}
          <header className="reveal mb-10">
            <Link href="/blog" className="font-mono text-[0.7rem] font-bold tracking-[0.12em] text-faint transition-colors hover:text-muted">
              ← IL BLOG
            </Link>

            {/* Copertina hero (se presente nel frontmatter) */}
            {post.cover && (
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl border border-white/10">
                <Image
                  src={post.cover}
                  alt={post.coverAlt}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 672px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.66rem] font-bold tracking-[0.12em] text-faint">
              <span className="rounded-full border border-violet-light/40 px-3 py-1 uppercase text-violet-light">
                {post.category}
              </span>
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
            <div className="mt-6">
              <ShareBar title={post.title} />
            </div>
            <hr className="divider-glow mt-8" />
          </header>

          {/* Corpo (markdown renderizzato; contenuto fidato dal repo) */}
          <div className="prose-h2ai reveal" dangerouslySetInnerHTML={{ __html: post.html }} />

          {/* Chiusura: CTA registro + altri articoli */}
          <footer className="mt-14">
            <hr className="divider-glow" />
            <div className="mt-8">
              <ShareBar title={post.title} />
            </div>
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
