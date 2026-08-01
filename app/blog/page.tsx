import { listPosts } from "@/lib/blog";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { BlogList } from "./BlogList";

export const metadata = {
  title: "Blog: AI, consenso e diritto d'immagine",
  description:
    "AI, diritto d'immagine, consenso e provenienza: la voce di SEMBLIC sull'era dei volti generati.",
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
            <BlogList posts={posts} />
          )}
        </section>
      </div>
    </div>
  );
}
