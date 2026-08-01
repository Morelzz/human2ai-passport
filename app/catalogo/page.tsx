// Link "view transition": le navigazioni verso i passport animano il ritratto
// come shared element (vt-portrait-<handle>). API identica a next/link.
import { Link } from "next-view-transitions";
import { getPublicAvatars } from "@/lib/registry";
import { TIER_CONFIG, Tier } from "@/lib/types";
import { galleryFromRow, portraitFor } from "@/lib/sample-galleries";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  // Review B4: solo il nome pagina, il suffisso " | Semblic" lo aggiunge il
  // template di app/layout.tsx (prima usciva doppio).
  title: "Avatar, il catalogo dei volti verificati",
  description: "Il registro pubblico dei volti consenzienti: persone reali, verificate e pagate. Sfoglia gli avatar.",
  alternates: { canonical: "/catalogo" },
};

type CatalogAvatar = {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  usage_count: number | null;
  revoked_at: string | null;
  gallery_urls?: unknown;
};

// Regola unica (lib/sample-galleries): avatar con galleria -> ritratto reale.
function imageFor(a: CatalogAvatar): string {
  return portraitFor(a);
}

// Pagina ADDITIVA: catalogo avatar (griglia). Mobile-first. Sfoglia tutti i
// volti approvati; per la ricerca guidata resta /match. Nessun flusso toccato.
export default async function CatalogoPage() {
  // Fonte UNICA del registro pubblico (lib/registry). Review B1: attivi prima
  // (Mario, volto reale, in testa), revocati IN FONDO — restano visibili:
  // la revoca rispettata è parte del racconto.
  const avatars = (await getPublicAvatars()).sort((a, b) => {
    const ra = a.revoked_at ? 1 : 0;
    const rb = b.revoked_at ? 1 : 0;
    if (ra !== rb) return ra - rb;
    // Volti reali (con galleria) in testa: Mario/Random e gli ambassador.
    const ga = galleryFromRow(a.handle, a.gallery_urls).length > 0 ? 1 : 0;
    const gb = galleryFromRow(b.handle, b.gallery_urls).length > 0 ? 1 : 0;
    return gb - ga;
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold tracking-[0.14em] text-teal">AVATAR DEL REGISTRO</span>
              {/* Titolo in display sottile (Geist peso 200, tracking -0.04em) come l'hero del passport */}
              <h1 className="mt-2 text-4xl font-extralight tracking-[-0.04em] sm:text-5xl">
                {avatars.length} {avatars.length === 1 ? "volto" : "volti"} nel registro
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                Ogni volto è una persona vera, verificata e consenziente. Tocca un volto per vederne il
                passaporto pubblico.
              </p>
            </div>
            <Link
              href="/match"
              className="shrink-0 rounded-full border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-semibold text-violet-light transition-colors hover:bg-violet/20"
            >
              Cerca un volto →
            </Link>
          </div>
          {/* Hairline tramonto, lo stesso filo delle sezioni del passport */}
          <div aria-hidden className="mb-8 h-px" style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.5), var(--hairline) 34%, transparent 72%)" }} />

          {avatars.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-sm leading-relaxed text-muted">
                Ancora nessun volto nel registro. Le persone arrivano prima dell&apos;AI.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {avatars.map((a) => {
                const tier = TIER_CONFIG[a.tier];
                const src = imageFor(a);
                return (
                  <Link
                    key={a.handle}
                    href={`/passport/${a.handle}`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-obsidian-2 transition-all hover:border-violet/40 hover:shadow-[0_18px_50px_-22px_rgba(242,169,59,0.45)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-obsidian-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={a.alias}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ viewTransitionName: `vt-portrait-${a.handle}`, filter: a.revoked_at ? "grayscale(0.85) brightness(0.78)" : undefined }}
                      />
                      {/* Glow tier in cima: profondita premium, tinta per intensita del livello */}
                      <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(72% 34% at 50% 0%, ${tier.color}26, transparent 70%)` }} />
                      {/* Scrim Obsidian morbido (non nero piatto): il volto respira sopra, il testo resta leggibile sotto */}
                      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,#0C0F17_0%,rgba(12,15,23,0.82)_22%,transparent_58%)]" />
                      {a.revoked_at && (
                        <span className="absolute right-2.5 top-2.5 rounded-full border border-crimson/40 bg-black/50 px-2 py-0.5 text-[0.6rem] font-bold text-crimson backdrop-blur">
                          REVOCATO
                        </span>
                      )}
                      <div className="absolute inset-x-3 bottom-3">
                        <p className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">{a.alias}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold"
                            style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}55` }}
                          >
                            {tier.label}
                          </span>
                          <span className="text-[0.66rem] text-white/55">
                            {(a.usage_count ?? 0).toLocaleString("it-IT")} utilizzi
                          </span>
                        </div>
                        {a.revoked_at && (
                          <p className="mt-1.5 text-[0.62rem] italic leading-snug text-white/60">
                            Questa persona ha cambiato idea. Il sistema ha obbedito.
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
