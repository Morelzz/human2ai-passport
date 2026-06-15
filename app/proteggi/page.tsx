import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import ProteggiClient from "./ProteggiClient";

export const metadata = {
  title: "Proteggi il tuo volto — Human2AI",
  description: "Registra il tuo volto perche' NON venga generato dall'AI dentro Human2AI. Diritto all'oblio generativo.",
};

// Fase 2.4 (modulo VETO): pagina di registrazione INVERSA. Richiede l'accesso
// (l'identita' va legata a un account). Mostra la conferma se gia' protetto.
export default async function ProteggiPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServerClient();
  const { data: existing } = await admin
    .from("avatars")
    .select("protection_only, revoked_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  const alreadyProtected = Boolean(existing?.protection_only && !existing?.revoked_at);
  const hasPublicAvatar = Boolean(existing && !existing.protection_only);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <ProteggiClient alreadyProtected={alreadyProtected} hasPublicAvatar={hasPublicAvatar} />
      </div>
    </div>
  );
}
