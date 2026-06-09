import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
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
import { PublicRoadmap } from "@/components/marketing/PublicRoadmap";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Reveal } from "@/components/motion/Reveal";

export default async function Home() {
  const supabase = createServerClient();
  const { data } = await supabase.from("avatars").select("*").order("consent_start");

  // Gate: solo avatar approvati nel registro pubblico.
  const approved = (data ?? []).filter((a) => (a.verification_status ?? "approved") === "approved");

  // In evidenza: Mario (volto reale) per primo, poi gli altri. Max 8 nel carosello.
  const featured: FeaturedAvatar[] = [...approved]
    .sort((a, b) => (a.handle === "mario-r" ? -1 : b.handle === "mario-r" ? 1 : 0))
    .slice(0, 8)
    .map((a) => ({
      handle: a.handle,
      alias: a.alias,
      portrait_url: a.portrait_url,
      tier: a.tier as Tier,
      usage_count: a.usage_count,
      revoked_at: a.revoked_at,
    }));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />

      <div className="relative z-[2]">
        <SiteNav />
        <Hero count={approved.length} />
        <Reveal><Tension /></Reveal>
        <Reveal><Manifesto /></Reveal>
        <Reveal><HowItWorks /></Reveal>
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
                  <span className="text-sm font-bold tracking-[0.18em]">HUMAN2AI</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-faint">
                  Il registro dei diritti d&apos;immagine. Il filtro di tutela umana sopra ogni IA generativa.
                </p>
                <p className="mt-3 font-mono text-[0.62rem] font-semibold tracking-[0.12em] text-muted">
                  REAL HUMANS · REAL RIGHTS · REAL EARNINGS
                </p>
              </div>

              {/* Colonne link (gli stessi di prima, organizzati) */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
                <div>
                  <span className="label-mono text-violet-light">Piattaforma</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <Link href="/match" className="text-sm text-faint transition-colors hover:text-foreground">Registro</Link>
                    <Link href="/pricing" className="text-sm text-faint transition-colors hover:text-foreground">Prezzi</Link>
                    <Link href="/verify" className="text-sm text-faint transition-colors hover:text-foreground">Verifica</Link>
                  </div>
                </div>
                <div>
                  <span className="label-mono text-teal">Fiducia</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <Link href="/trasparenza" className="text-sm text-faint transition-colors hover:text-foreground">Trasparenza</Link>
                    <Link href="/sviluppatori" className="text-sm text-faint transition-colors hover:text-foreground">Sviluppatori</Link>
                  </div>
                </div>
                <div>
                  <span className="label-mono text-crimson-light">Legale</span>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <Link href="/privacy" className="text-sm text-faint transition-colors hover:text-foreground">Privacy</Link>
                    <Link href="/termini" className="text-sm text-faint transition-colors hover:text-foreground">Termini</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Wordmark gigante in chiusura (tipografia oversize, trend 2026) */}
            <div aria-hidden className="pointer-events-none mt-12 select-none overflow-hidden">
              <p className="bg-gradient-to-b from-white/[0.07] to-transparent bg-clip-text text-center text-[18vw] font-extrabold leading-[0.85] tracking-tighter text-transparent sm:text-[11rem]">
                HUMAN2AI
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
