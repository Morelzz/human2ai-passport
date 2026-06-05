import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import ConsentClient from "./ConsentClient";

export default async function ConsentPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServerClient();
  const { data: avatar } = await admin
    .from("avatars")
    .select("handle, approved_categories, excluded_categories, revoked_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!avatar) redirect("/account");

  return (
    <ConsentClient
      handle={avatar.handle}
      approved={avatar.approved_categories ?? []}
      excluded={avatar.excluded_categories ?? []}
      revokedAt={avatar.revoked_at}
    />
  );
}
