import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import VerifyClient from "./VerifyClient";

export default async function VerifyIdentityPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status")
    .eq("id", user.id)
    .single();

  return <VerifyClient userId={user.id} initialStatus={profile?.kyc_status ?? "none"} />;
}
