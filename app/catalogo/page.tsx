import Link from "next/link";
import { registroPubblico } from "@/lib/registro-cache";
import { galleryFromRow } from "@/lib/sample-galleries";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { type TileAvatar } from "@/components/avatar/AvatarTile";
import { Button } from "@/components/ui/button";
import { CatalogoGriglia } from "./CatalogoGriglia";
import { voltoCatalogo } from "@/lib/catalogo";
import { splitEcho } from "@/lib/wallet";

export const metadata = {
  title: "Avatar, il catalogo dei volti verificati",
  description: "Il registro pubblico dei volti consenzienti: persone reali, verificate e pagate. Sfoglia gli avatar.",
  alternates: { canonical: "/catalogo" },
};

// Catalogo, casa nuova: pagina chiara, griglia di tile 3:4. Attivi prima,
// revocati in fondo ma visibili: la revoca rispettata e' parte del racconto.
export default async function CatalogoPage() {
  const avatars = [...(await registroPubblico())].sort((a, b) => {
    const ra = a.revoked_at ? 1 : 0;
    const rb = b.revoked_at ? 1 : 0;
    if (ra !== rb) return ra - rb;
    const ga = galleryFromRow(a.handle, a.gallery_urls).length > 0 ? 1 : 0;
    const gb = galleryFromRow(b.handle, b.gallery_urls).length > 0 ? 1 : 0;
    return gb - ga;
  });
  const revocati = avatars.filter((a) => a.revoked_at).length;

  // Quello che si vede sulla tessera: foto si'/no, video si'/no, utilizzi.
  const volti = avatars.map((a) => voltoCatalogo(a as Parameters<typeof voltoCatalogo>[0]));
  const tile: Record<string, TileAvatar> = {};
  for (const a of avatars) {
    tile[a.handle] = { handle: a.handle, alias: a.alias, gallery_urls: a.gallery_urls, revoked_at: a.revoked_at, gender: (a as { gender?: string | null }).gender ?? null };
  }
  // "da X euro": lo scatto piu' economico del listino (bozza quadrata), dalla
  // stessa funzione che fa pagare. Un prezzo vero non si nasconde.
  const daCent = splitEcho(null, "1024x1024", "medium").gross_cents;

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
          <CatalogoGriglia volti={volti} tile={tile} daCent={daCent} />
        )}
      </main>
      <Footer />
    </div>
  );
}
