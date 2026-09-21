import Link from "next/link";
import { Tier } from "@/lib/types";
import { AvatarTile } from "@/components/avatar/AvatarTile";
import { SectionTitle } from "@/components/marketing/SectionTitle";
import { Button } from "@/components/ui/button";
import { articoloPlurale } from "@/lib/strings/articolo";

export interface FeaturedAvatar {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  usage_count: number;
  revoked_at: string | null;
  gallery_urls?: string[] | null;
  gender?: string | null;
}

// [IL REGISTRO], casa nuova: i volti veri in una griglia di tile 3:4 (quattro
// per riga su desktop); sul telefono la stessa riga scorre di lato. Ogni
// immagine e' generata da Semblic col consenso della persona che si vede.
export function Registry({ avatars, total }: { avatars: FeaturedAvatar[]; total: number }) {
  return (
    <section className="mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-24">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          kicker="Il registro"
          subtitle="Volti veri, scelti e pagati. Ogni immagine qui sotto è generata da Semblic con il consenso della persona che vedi."
          className="mb-0 sm:mb-0"
        >
          Persone, non prompt.
        </SectionTitle>
        <Button asChild variant="secondary" className="hidden shrink-0 sm:inline-flex">
          <Link href="/catalogo">Tutti {articoloPlurale(total)} {total} volti</Link>
        </Button>
      </div>

      <div className="riga-scorrevole -mx-5 mt-7 px-5 sm:mx-0 sm:mt-9 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0 lg:grid-cols-4">
        {avatars.map((a) => (
          <AvatarTile key={a.handle} a={a} className="w-[170px] sm:w-auto" />
        ))}
      </div>

      <div className="mt-6 sm:hidden">
        <Button asChild variant="secondary" size="md" className="w-full">
          <Link href="/catalogo">Tutti {articoloPlurale(total)} {total} volti</Link>
        </Button>
      </div>
    </section>
  );
}
