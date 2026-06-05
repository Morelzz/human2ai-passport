import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import NewAvatarClient from "./NewAvatarClient";

export default async function NewAvatarPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await auth
    .from("profiles")
    .select("role, kyc_status, full_name")
    .eq("id", user.id)
    .single();

  // Solo creatori verificati
  if (profile?.role !== "seller" || profile?.kyc_status !== "approved") {
    redirect("/account");
  }

  // Se ha già un avatar, manda al suo passport
  const admin = createServerClient();
  const { data: existing } = await admin
    .from("avatars")
    .select("handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/passport/${existing.handle}`);

  return <NewAvatarClient defaultAlias={profile?.full_name ?? ""} />;
}
