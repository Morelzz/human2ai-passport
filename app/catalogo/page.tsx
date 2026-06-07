import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { TIER_CONFIG, Tier } from "@/lib/types";
import { avatarArt } from "@/lib/avatar-art";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  title: "Catalogo avatar — Human2AI",
  description: "Il registro pubblico dei volti consenzienti: persone reali, verificate e pagate. Sfoglia il catalogo.",
};

type CatalogAvatar = {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  usage_count: number | null;
  revoked_at: string | null;
};

function imageFor(a: CatalogAvatar): string {
  if (a.handle === "mario-r") return "/api/sample/mario-r/0";
  return avatarArt(a.handle, a.alias);
}

// Pagina ADDITIVA: catalogo avatar (griglia). Mobile-first. Sfoglia tutti i
// volti approvati; per la ricerca guidata resta /match. Nessun flusso toccato.
export default async function CatalogoPage() {
  const sb = createServerClient();
  const { data } = await sb
    .from("avatars")
    .select("handle, alias, portrait_url, tier, usage_count, revoked_at, verification_status, consent_start")
    .order("consent_start");

  const avatars = ((data ?? []) as (CatalogAvatar & { verification_status?: string })[])
    .filter((a) => (a.verification_status ?? "approved") === "approved")
    // Mario (volto reale) per primo.
    .sort((a, b) => (a.handle === "mario-r" ? -1 : b.handle === "mario-r" ? 1 : 0));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold tracking-[0.14em] text-teal">CATALOGO AVATAR</span>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {avatars.length} {avatars.length === 1 ? "volto" : "volti"} nel registro
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
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
                    className="group block overflow-hidden rounded-2xl border border-white/8 bg-obsidian-2 transition-colors hover:border-white/20"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-obsidian-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={a.alias}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.72),transparent_55%)]" />
                      {a.revoked_at && (
                        <span className="absolute right-2.5 top-2.5 rounded-full border border-crimson/40 bg-black/50 px-2 py-0.5 text-[0.6rem] font-bold text-crimson backdrop-blur">
                          REVOCATO
                        </span>
                      )}
                      <div className="absolute inset-x-3 bottom-3">
                        <p className="truncate text-sm font-bold text-white sm:text-base">{a.alias}</p>
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
