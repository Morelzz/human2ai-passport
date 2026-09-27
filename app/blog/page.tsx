import { listPosts } from "@/lib/blog";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { BlogList } from "./BlogList";
import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";

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
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        <TestataTesto
          larghezza="max-w-3xl"
          occhiello="Il blog"
          titolo="Voci sull'era dei volti generati."
          sotto="AI, diritto d'immagine, consenso, provenienza. Quello che sta succedendo ai volti umani nell'era generativa, e come tenerli in mani umane."
          dato={`${posts.length} ${posts.length === 1 ? "articolo" : "articoli"}`}
        />
        <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8 sm:pb-24">

          {posts.length === 0 ? (
            <p className="reveal text-muted">Primi articoli in arrivo.</p>
          ) : (
            <BlogList posts={posts} />
          )}
        </section>
        <Footer />
      </div>
    </div>
  );
}
