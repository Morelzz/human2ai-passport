import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { voltoDelTitolare } from "@/lib/volto-del-titolare";
import { SiteNav } from "@/components/marketing/SiteNav";
import NewAvatarClient from "./NewAvatarClient";

export default async function NewAvatarPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Favatar");

  const { data: profile } = await auth
    .from("profiles")
    .select("role, kyc_status, full_name")
    .eq("id", user.id)
    .single();

  const isEnterprise = profile?.role === "enterprise";

  // Possono creare: creatori privati verificati (KYC) oppure organizzazioni.
  if (!isEnterprise && (profile?.role !== "seller" || profile?.kyc_status !== "approved")) {
    redirect("/account");
  }

  // Vincolo 1:1 SOLO per i privati: se ha già un avatar, manda al suo passport.
  // Le organizzazioni possono crearne molti, quindi non vengono reindirizzate.
  if (!isEnterprise) {
    const admin = createServerClient();
    const existing = await voltoDelTitolare(admin, user.id, "handle");
    if (existing) redirect(`/passport/${existing.handle}`);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <NewAvatarClient defaultAlias={isEnterprise ? "" : (profile?.full_name ?? "")} isEnterprise={isEnterprise} />
      </div>
    </div>
  );
}
