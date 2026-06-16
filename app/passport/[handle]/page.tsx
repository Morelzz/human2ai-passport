import { notFound, permanentRedirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import { Avatar, ConsentEvent, TIER_CONFIG } from "@/lib/types";
import { truncateToken } from "@/lib/token";
import { galleryFromRow } from "@/lib/sample-galleries";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import PassportClient from "./PassportClient";

// Handle storici rinominati: redirect permanente (308) al nuovo handle, per i
// vecchi link gia' indicizzati. (0.4 naming: 'mario-r' e' diventato 'random'.)
const OLD_HANDLE_REDIRECTS: Record<string, string> = { "mario-r": "random" };

interface Props {
  params: Promise<{ handle: string }>;
}

// Review C5 — metadata per-passport: titolo/descrizione propri; l'og:image
// arriva da opengraph-image.tsx (convenzione Next, agganciata in automatico).
export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const sb = createServerClient();
  const { data: a } = await sb
    .from("avatars")
    .select("alias, revoked_at, verification_status, protection_only")
    .eq("handle", handle)
    .single();
  if (!a || !isPublicAvatar(a)) return { title: "Passaporto del volto" };
  const title = `${a.alias} · Passaporto del volto`;
  const description = a.revoked_at
    ? `${a.alias} ha revocato il consenso: questo volto non è più generabile. La revoca è la prova che il sistema obbedisce.`
    : `${a.alias} è una persona reale, verificata e consenziente del registro Human2AI. Ogni utilizzo del suo volto è autorizzato, tracciato e pagato.`;
  // openGraph/twitter espliciti: senza, resterebbero quelli globali del layout
  // (l'og:image invece arriva dalla convenzione e vince comunque).
  return {
    title,
    description,
    openGraph: { title, description, type: "profile", siteName: "Human2AI", locale: "it_IT" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PassportPage({ params }: Props) {
  const { handle } = await params;
  const supabase = createServerClient();

  const { data: avatar, error } = await supabase
    .from("avatars")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error || !avatar) {
    const renamed = OLD_HANDLE_REDIRECTS[handle];
    if (renamed) permanentRedirect(`/passport/${renamed}`);
    notFound();
  }
  // Gate: i passport non approvati non sono pubblici; e i volti in SOLA
  // PROTEZIONE (VETO) non compaiono mai su una superficie pubblica (isPublicAvatar).
  if (!isPublicAvatar(avatar)) notFound();

  const { data: events } = await supabase
    .from("consent_events")
    .select("*")
    .eq("avatar_id", avatar.id)
    .order("occurred_at", { ascending: true });

  const consentEvents: ConsentEvent[] = events ?? [];
  const av: Avatar = avatar as Avatar;

  // Creatore verificato? (avatar con proprietario il cui KYC è approvato)
  let ownerVerified = false;
  if (avatar.owner_id) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", avatar.owner_id)
      .single();
    ownerVerified = ownerProfile?.kyc_status === "approved";
  }

  const status = av.revoked_at ? "REVOCATO" : "ATTIVO";
  const tier = TIER_CONFIG[av.tier];
  const tokenShort = truncateToken(av.token_hash);

  // Atto di proprietà: il token unico è il titolo. I campi on-chain (Base) sono
  // opzionali finché non si applica ownership.sql / non si ancora la prima volta.
  const a = avatar as Record<string, unknown>;
  const ownership = {
    owner: av.alias,
    ownerVerified,
    tokenShort,
    issued: av.consent_start,
    soulbound: (a.soulbound as boolean) ?? true,
    chain: (a.chain as string) ?? null,
    tx: (a.onchain_tx as string) ?? null,
    anchoredAt: (a.anchored_at as string) ?? null,
    ownerWallet: (a.owner_wallet as string) ?? null,
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <PassportClient
          avatar={av}
          events={consentEvents}
          status={status}
          tier={tier}
          tokenShort={tokenShort}
          ownerVerified={ownerVerified}
          galleryCount={galleryFromRow(handle, (avatar as Record<string, unknown>).gallery_urls).length}
          ownership={ownership}
        />
      </div>
    </div>
  );
}
