import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import VerifyClient from "./VerifyClient";

export default async function VerifyIdentityPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, kyc_status")
    .eq("id", user.id)
    .single();

  // KYC riservato ai creatori/venditori. Compratori (e altri) tornano all'account.
  if (profile?.role !== "seller") redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <VerifyClient initialStatus={profile?.kyc_status ?? "none"} />
      </div>
    </div>
  );
}
