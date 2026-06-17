import Link from "next/link";
import { getPublicAvatars, countProtectedFaces } from "@/lib/registry";
import { createServerClient } from "@/lib/supabase";
import { countBlockedThisMonth } from "@/lib/blocked";
import { Tier } from "@/lib/types";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Tension } from "@/components/marketing/Tension";
import { Manifesto } from "@/components/marketing/Manifesto";
import { Audiences } from "@/components/marketing/Audiences";
import { Trust } from "@/components/marketing/Trust";
import { Registry, FeaturedAvatar } from "@/components/marketing/Registry";
import { FilterMiniDemo, FilterDemoAvatar } from "@/components/marketing/FilterMiniDemo";
import { PublicRoadmap } from "@/components/marketing/PublicRoadmap";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Reveal } from "@/components/motion/Reveal";
import { galleryFromRow } from "@/lib/sample-galleries";

// A4 — social. Handle Instagram UFFICIALE (confermato da Morelz, 2026-06-10).
// URL pulito senza parametri di condivisione/tracking. Un solo punto di verità.
const INSTAGRAM_HANDLE = "semblic";
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;

export default async function Home() {
  // Fonte UNICA del registro pubblico (lib/registry): stessi volti e stessi
  // contatori di catalogo e trasparenza.
  const approved = await getPublicAvatars();

  // Review C3 / Fase 4.1 — i DUE numeri manifesto nell'hero, stessa fonte di
  // /trasparenza: (1) richieste rifiutate dal filtro del consenso questo mese,
  // (2) volti registrati per non essere mai generati (VETO). Un solo client.
  const sb = createServerClient();
  const blockedMonth = await countBlockedThisMonth(sb);
  const protectedFaces = await countProtectedFaces(sb);

  // In evidenza (review B1): solo consensi ATTIVI, ordinati per utilizzi —
  // i volti REALI (con galleria: Mario/Random e gli ambassador) restano in
  // testa. I revocati vivono nel catalogo, in fondo.
  const featured: FeaturedAvatar[] = approved
    .filter((a) => !a.revoked_at)
    .sort((a, b) => {
      const ga = galleryFromRow(a.handle, a.gallery_urls).length > 0 ? 1 : 0;
      const gb = galleryFromRow(b.handle, b.gallery_urls).length > 0 ? 1 : 0;
      if (ga !== gb) return gb - ga;
      return (b.usage_count ?? 0) - (a.usage_count ?? 0);
    })
    .slice(0, 8)
    .map((a) => ({
      handle: a.handle,
      alias: a.alias,
      portrait_url: a.portrait_url,
      tier: a.tier as Tier,
      usage_count: a.usage_count ?? 0,
      revoked_at: a.revoked_at,
      gallery_urls: (a.gallery_urls as string[] | null) ?? null,
    }));

  // Review C2 — persone per la mini-demo del filtro: le prime 4 attive +
  // le revocate (vedere il BLOCK della revoca È la tesi del prodotto).
  const demoAvatars: FilterDemoAvatar[] = [
    ...featured.slice(0, 4).map((a) => ({ handle: a.handle, alias: a.alias, revoked: false })),
    ...approved.filter((a) => a.revoked_at).map((a) => ({ handle: a.handle, alias: a.alias, revoked: true })),
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />

      <div className="relative z-[2]">
        <SiteNav />
        <Hero count={approved.length} blockedMonth={blockedMonth} protectedFaces={protectedFaces} />
        <Reveal><Tension /></Reveal>
        <Reveal><Manifesto /></Reveal>
        {/* Niente <Reveal>: la sezione è PINNATA da ScrollTrigger e un antenato
            con transform romperebbe il position:fixed del pin. Si anima da sola. */}
        <HowItWorks />
        <Reveal><FilterMiniDemo avatars={demoAvatars} /></Reveal>
        <Reveal><Audiences /></Reveal>
        <Reveal><Registry avatars={featured} total={approved.length} /></Reveal>
        <Reveal><Trust /></Reveal>
        <Reveal><PublicRoadmap /></Reveal>
        <Reveal><ClosingCTA /></Reveal>

        <footer className="relative mt-8 overflow-hidden">
          <hr className="divider-glow mx-auto max-w-6xl" />
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:px-8">
            <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
              {/* Identità */}
              <div className="max-w-xs">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-shield.png" alt="" aria-hidden className="h-9 w-9 object-contain opacity-90 [mask-image:radial-gradient(circle,#000_56%,transparent_80%)] [-webkit-mask-image:radial-gradient(circle,#000_56%,transparent_80%)]" />
                  <span className="text-sm font-bold tracking-[0.18em]">SEMBLIC</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-faint">
                  Il registro dei diritti d&apos;immagine. Il filtro di tutela umana sopra ogni IA generativa.
                </p>
                <p className="mt-3 font-mono text-[0.62rem] font-semibold tracking-[0.12em] text-muted">
                  REAL HUMANS · REAL RIGHTS · REAL EARNINGS
                </p>

                {/* A4 — Seguici: link leggero, niente embed */}
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-2 pl-2.5 pr-4 transition-all hover:border-violet/40 hover:bg-violet/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F2A93B,#B8005C)]">
                    {/* Glifo Instagram inline (lucide non distribuisce più icone brand) */}
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-muted transition-colors group-hover:text-foreground">@{INSTAGRAM_HANDLE}</span>
                </a>
                <p className="mt-2 text-[0.68rem] text-faint">I volti veri dietro il registro, ogni settimana.</p>
              </div>

              {/* Colonne link (gli stessi di prima, organizzati) */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
                <div>
                  <span className="label-mono text-violet-light">Piattaforma</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <Link href="/match" className="text-sm text-faint transition-colors hover:text-foreground">Registro</Link>
                    <Link href="/scansione" className="text-sm text-faint transition-colors hover:text-foreground">La scansione</Link>
                    <Link href="/prezzi" className="text-sm text-faint transition-colors hover:text-foreground">Prezzi</Link>
                    <Link href="/verify" className="text-sm text-faint transition-colors hover:text-foreground">Verifica</Link>
                    <Link href="/partner" className="text-sm text-faint transition-colors hover:text-foreground">Diventa partner</Link>
                    <Link href="/academy" className="text-sm text-faint transition-colors hover:text-foreground">Academy</Link>
                    <Link href="/studio" className="text-sm text-faint transition-colors hover:text-foreground">Studio</Link>
                    <Link href="/enterprise" className="text-sm text-faint transition-colors hover:text-foreground">Enterprise</Link>
                  </div>
                </div>
                <div>
                  <span className="label-mono text-teal">Fiducia</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <Link href="/trasparenza" className="text-sm text-faint transition-colors hover:text-foreground">Trasparenza</Link>
                    <Link href="/sviluppatori" className="text-sm text-faint transition-colors hover:text-foreground">Sviluppatori</Link>
                    <Link href="/faq" className="text-sm text-faint transition-colors hover:text-foreground">FAQ</Link>
                    <Link href="/blog" className="text-sm text-faint transition-colors hover:text-foreground">Blog</Link>
                  </div>
                </div>
                <div>
                  <span className="label-mono text-crimson-light">Legale</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <Link href="/privacy" className="text-sm text-faint transition-colors hover:text-foreground">Privacy</Link>
                    <Link href="/termini" className="text-sm text-faint transition-colors hover:text-foreground">Termini</Link>
                    <Link href="/cookie" className="text-sm text-faint transition-colors hover:text-foreground">Cookie</Link>
                    <Link href="/contatti" className="text-sm text-faint transition-colors hover:text-foreground">Contatti</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Wordmark gigante in chiusura (tipografia oversize, trend 2026) */}
            <div aria-hidden className="pointer-events-none mt-12 select-none overflow-hidden">
              <p className="bg-gradient-to-b from-white/[0.07] to-transparent bg-clip-text text-center text-[18vw] font-extrabold leading-[0.85] tracking-tighter text-transparent sm:text-[11rem]">
                SEMBLIC
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
