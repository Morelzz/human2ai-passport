import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import KybReviewClient from "./KybReviewClient";
import { eOperatore } from "@/lib/operatori";

// Coda di revisione KYB (aziende) — riservata agli operatori (role 'admin').
export default async function KybReviewPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Fkyb-review");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (!eOperatore(profile?.role, user.email)) redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <KybReviewClient />
      </div>
    </div>
  );
}
