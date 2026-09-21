import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { getPublicAvatars } from "@/lib/registry";
import { galleryFromRow, portraitFor } from "@/lib/sample-galleries";
import { sampleSrc } from "@/lib/sample-size";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CreaClient, type Scatto } from "./crea/CreaClient";

// SEO: title/description propri. La pagina e' riservata a chi ha fatto
// l'accesso, ma il title serve la scheda del browser e i link condivisi.
export const metadata = {
  title: "Crea con un volto verificato",
  description:
    "Scegli un volto del registro, con un consenso esplicito e verificabile, scrivi la scena e ottieni uno scatto certificato che paga la persona reale.",
};

// Crea (17/9/2026): pagina chiara, flusso "una frase sola". Il server prepara
// i volti generabili (pubblici, non revocati, con consenso commerciale) e gli
// ultimi scatti di chi crea; tutto il resto vive in CreaClient.
export default async function MatchPage({ searchParams }: { searchParams: Promise<{ avatar?: string }> }) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  // CTA dal passaporto: /match?avatar=<handle> apre Crea con quel volto gia' scelto.
  const { avatar } = await searchParams;
  // Dopo l'accesso si torna qui, con lo stesso volto gia' scelto.
  if (!user) redirect(`/login?next=${encodeURIComponent(avatar ? `/match?avatar=${avatar}` : "/match")}`);

  const admin = createServerClient();
  const [avatars, { data: gens }] = await Promise.all([
    getPublicAvatars(admin),
    admin
      .from("generations")
      .select("certificate, image_url, avatars!generations_avatar_id_fkey(alias)")
      .eq("buyer_id", user.id)
      .eq("mode", "commercial")
      .not("certificate", "is", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const volti = avatars
    .filter((a) => !a.revoked_at && (a as { commercial_consent?: boolean | null }).commercial_consent !== false)
    .sort((a, b) => galleryFromRow(b.handle, b.gallery_urls).length - galleryFromRow(a.handle, a.gallery_urls).length)
    .map((a) => ({ handle: a.handle, alias: a.alias, src: sampleSrc(portraitFor(a), 480) }));

  const ultimi: Scatto[] = (gens ?? []).map((g) => {
    const av = Array.isArray(g.avatars) ? g.avatars[0] : g.avatars;
    return { certificate: String(g.certificate), image_url: g.image_url ?? null, alias: (av as { alias?: string } | null)?.alias ?? "Avatar" };
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteNav />
      <CreaClient volti={volti} iniziale={avatar ?? null} ultimi={ultimi} />
    </div>
  );
}
