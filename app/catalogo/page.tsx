import Link from "next/link";
import { getPublicAvatars } from "@/lib/registry";
import { galleryFromRow } from "@/lib/sample-galleries";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { AvatarTile } from "@/components/avatar/AvatarTile";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Avatar, il catalogo dei volti verificati",
  description: "Il registro pubblico dei volti consenzienti: persone reali, verificate e pagate. Sfoglia gli avatar.",
  alternates: { canonical: "/catalogo" },
};

// Catalogo, casa nuova: pagina chiara, griglia di tile 3:4. Attivi prima,
// revocati in fondo ma visibili: la revoca rispettata e' parte del racconto.
export default async function CatalogoPage() {
  const avatars = (await getPublicAvatars()).sort((a, b) => {
    const ra = a.revoked_at ? 1 : 0;
    const rb = b.revoked_at ? 1 : 0;
    if (ra !== rb) return ra - rb;
    const ga = galleryFromRow(a.handle, a.gallery_urls).length > 0 ? 1 : 0;
    const gb = galleryFromRow(b.handle, b.gallery_urls).length > 0 ? 1 : 0;
    return gb - ga;
  });
  const revocati = avatars.filter((a) => a.revoked_at).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="kicker">Il registro</span>
            <h1 className="text-balance text-[2.4rem] font-bold leading-[1] tracking-[-0.035em] sm:text-[3.5rem]">
              {avatars.length} {avatars.length === 1 ? "volto" : "volti"} nel registro
            </h1>
            <p className="max-w-[54ch] text-pretty text-[1.05rem] leading-relaxed text-muted">
              Ogni volto è una persona vera, verificata e consenziente. Tocca un volto per vederne il passaporto pubblico.
              {revocati > 0 && ` ${revocati === 1 ? "Una persona ha cambiato idea: il sistema ha obbedito." : `${revocati} persone hanno cambiato idea: il sistema ha obbedito.`}`}
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0 self-start sm:self-auto">
            <Link href="/match">Cerca un volto</Link>
          </Button>
        </div>

        {avatars.length === 0 ? (
          <div className="card mt-8 p-8 text-center">
            <p className="text-[0.95rem] leading-relaxed text-muted">Ancora nessun volto nel registro. Le persone arrivano prima dell&apos;AI.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {avatars.map((a, i) => (
              <AvatarTile
                key={a.handle}
                priority={i < 4}
                a={{ handle: a.handle, alias: a.alias, gallery_urls: a.gallery_urls, revoked_at: a.revoked_at, gender: (a as { gender?: string | null }).gender ?? null }}
              />
            ))}
            {/* Ultima tessera: l'invito. Chiude la griglia e dice cosa fare dopo. */}
            <Link
              href="/signup/avatar"
              className="group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-[18px] border border-dashed border-edge bg-surface bg-[radial-gradient(90%_55%_at_100%_0%,var(--amber-soft),transparent_70%)] p-4 transition-colors hover:border-amber focus-ring sm:p-5"
            >
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-soft text-[1.4rem] font-semibold leading-none text-amber-ink transition-transform group-hover:scale-110">+</span>
              <span className="flex flex-col gap-1.5">
                <span className="text-[1.15rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.3rem]">Il tuo volto qui</span>
                <span className="text-[0.85rem] leading-snug text-muted">Verifica, consenso firmato e una quota a ogni utilizzo.</span>
                <span className="mt-1 text-[0.85rem] font-semibold text-amber-ink">Entra nel registro</span>
              </span>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
