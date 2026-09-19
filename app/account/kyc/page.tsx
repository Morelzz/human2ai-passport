import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import KycClient from "./KycClient";
import { eOperatore } from "@/lib/operatori";

export const metadata = { title: "Verifiche identità (KYC)" };

// Coda di revisione KYC manuale — riservata agli operatori (role 'admin').
export default async function KycReviewPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Fkyc");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (!eOperatore(profile?.role, user.email)) redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <KycClient />
      </div>
    </div>
  );
}
