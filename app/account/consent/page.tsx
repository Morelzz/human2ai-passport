import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import ConsentClient from "./ConsentClient";

export default async function ConsentPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServerClient();
  const { data: avatar } = await admin
    .from("avatars")
    .select("handle, approved_categories, excluded_categories, revoked_at, available_for_booking, protection_only, gender, age_range, ethnicity, hair_color, eye_color, body_type, height, facial_hair, glasses, tattoos, language")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!avatar) redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
    <ConsentClient
      handle={avatar.handle}
      approved={avatar.approved_categories ?? []}
      excluded={avatar.excluded_categories ?? []}
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
