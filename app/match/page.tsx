import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import MatchClient from "./MatchClient";

// SEO: title/description propri (prima generici dal template del layout). La
// pagina e' gated (redirect a /login per gli anonimi), ma il title serve la tab
// del browser e i link condivisi; la card social resta quella di default.
export const metadata = {
  title: "Genera con un volto verificato",
  description:
    "Scegli un volto del registro, consenziente per la tua categoria, e genera contenuti che pagano la persona reale. Solo identita' verificate, mai volti inventati.",
};

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
