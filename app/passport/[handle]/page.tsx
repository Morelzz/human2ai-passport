import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { Avatar, ConsentEvent, TIER_CONFIG } from "@/lib/types";
import { truncateToken } from "@/lib/token";
import { galleryCount } from "@/lib/sample-galleries";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import PassportClient from "./PassportClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function PassportPage({ params }: Props) {
  const { handle } = await params;
  const supabase = createServerClient();

  const { data: avatar, error } = await supabase
    .from("avatars")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error || !avatar) notFound();
  // Gate: i passport non ancora approvati non sono pubblici.
  if ((avatar.verification_status ?? "approved") !== "approved") notFound();

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
          galleryCount={galleryCount(handle)}
        />
      </div>
    </div>
  );
}
