import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import ConsentClient from "./ConsentClient";

export default async function ConsentPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Fconsent");

  const admin = createServerClient();
  const { data: avatar } = await admin
    .from("avatars")
    .select("handle, commercial_consent, revoked_at, available_for_booking, protection_only, gender, age_range, ethnicity, hair_color, eye_color, body_type, height, facial_hair, glasses, tattoos, language")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!avatar) redirect("/account");
  // Consenso al video (anima_video.sql): lettura a parte, se la colonna manca l'interruttore non c'e'.
  const { data: vid, error: vidErr } = await admin.from("avatars").select("video_consent").eq("owner_id", user.id).maybeSingle();
  const videoConsent = vidErr ? null : Boolean((vid as { video_consent?: boolean } | null)?.video_consent);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
    <ConsentClient
      handle={avatar.handle}
      commercialConsent={avatar.commercial_consent ?? true}
      videoConsent={videoConsent}
      revokedAt={avatar.revoked_at}
      availableForBooking={avatar.available_for_booking ?? false}
      protectionOnly={avatar.protection_only ?? false}
      kit={{
        gender: avatar.gender,
        age_range: avatar.age_range,
        ethnicity: avatar.ethnicity,
        hair_color: avatar.hair_color,
        eye_color: avatar.eye_color,
        body_type: avatar.body_type,
        height: avatar.height,
        facial_hair: avatar.facial_hair,
        glasses: avatar.glasses,
        tattoos: avatar.tattoos,
        language: avatar.language,
      }}
    />
      </div>
    </div>
  );
}
