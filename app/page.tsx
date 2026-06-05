import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";
import { Tier } from "@/lib/types";
import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Registry, FeaturedAvatar } from "@/components/marketing/Registry";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";

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

  // Sessione per la nav.
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  let firstName: string | null = null;
  if (user) {
    const { data: profile } = await auth.from("profiles").select("full_name").eq("id", user.id).single();
    const full = profile?.full_name || user.email || "";
    firstName = full ? String(full).trim().split(/\s+/)[0] : "Account";
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      {/* Strato cinematografico (bagliori + grana) */}
      <div className="cine-bg" aria-hidden />
      <div className="grain" aria-hidden />

      <div className="relative z-[2]">
        <Navbar firstName={firstName} />
        <Hero count={approved.length} />
        <HowItWorks />
        <Registry avatars={featured} total={approved.length} />
        <ClosingCTA />

        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] px-5 py-8 sm:px-8">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-shield.png" alt="" aria-hidden className="h-7 w-7 object-contain opacity-80 [mask-image:radial-gradient(circle,#000_56%,transparent_80%)] [-webkit-mask-image:radial-gradient(circle,#000_56%,transparent_80%)]" />
            <span className="text-xs font-bold tracking-[0.15em] text-muted">HUMAN2AI</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/match" className="text-sm text-faint hover:text-muted">Registro</Link>
            <Link href="/pricing" className="text-sm text-faint hover:text-muted">Prezzi</Link>
            <Link href="/trasparenza" className="text-sm text-faint hover:text-muted">Trasparenza</Link>
            <Link href="/verify" className="text-sm text-faint hover:text-muted">Verifica</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
