import Link from "next/link";
import { registroPubblico, numeriRegistro } from "@/lib/registro-cache";
import { Tier } from "@/lib/types";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { IlSet } from "@/components/marketing/IlSet";
import { Trust } from "@/components/marketing/Trust";
import { Registry, FeaturedAvatar } from "@/components/marketing/Registry";
import { WardSection } from "@/components/marketing/WardSection";
import { AiActStrip } from "@/components/marketing/AiActStrip";
import { ToolsBusiness } from "@/components/marketing/ToolsBusiness";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Footer } from "@/components/marketing/Footer";
import { galleryFromRow } from "@/lib/sample-galleries";


export default async function Home() {
  // Fonte UNICA del registro pubblico, in cache (lib/registro-cache): stessi
  // volti e stessi contatori di catalogo e trasparenza. Le due letture partono
  // insieme: prima erano tre giri sul DB in fila, e la pagina non partiva.
  const [approved, numeri] = await Promise.all([registroPubblico(), numeriRegistro()]);
  const { protetti: protectedFaces, pagate: paidCount } = numeri;

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
      gender: (a as { gender?: string | null }).gender ?? null,
    }));

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteNav />
      <main>
        <Hero count={approved.length} paidCount={paidCount} protectedFaces={protectedFaces} />
        <div className="sv"><Registry avatars={featured} total={approved.length} /></div>
        {/* Le card di Come funziona entrano una per una: .sv sta dentro, sulle card. */}
        <HowItWorks />
        <IlSet />
        <div className="sv"><WardSection /></div>
        <div className="sv"><Trust /></div>
        <div className="sv"><ToolsBusiness /></div>
        <div className="sv"><AiActStrip /></div>
        <ClosingCTA />
      </main>
        <Footer />
    </div>
  );
}
