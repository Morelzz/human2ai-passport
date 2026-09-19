import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import ReviewClient from "./ReviewClient";
import { eOperatore } from "@/lib/operatori";

// Coda di revisione manuale — riservata agli operatori (role 'admin').
export default async function ReviewPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Freview");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (!eOperatore(profile?.role, user.email)) redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <ReviewClient />
      </div>
    </div>
  );
}
