import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import MatchClient from "./MatchClient";

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ avatar?: string }> }) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");
  // CTA dal passport: /match?avatar=<handle> apre direttamente la generazione
  // con quel volto selezionato, saltando il brief.
  const { avatar } = await searchParams;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <MatchClient initialHandle={avatar ?? null} />
      </div>
    </div>
  );
}
