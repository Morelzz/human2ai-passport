import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import FaceIndexClient from "./FaceIndexClient";
import { eOperatore } from "@/lib/operatori";

export const metadata = { title: "Indice volti del registro" };

// Costruzione dell'indice volti — riservata agli operatori (role 'admin').
// I descrittori si calcolano nel browser dell'operatore (face-api): il
// server salva solo i vettori, mai i pixel.
export default async function FaceIndexPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Fface-index");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (!eOperatore(profile?.role, user.email)) redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <FaceIndexClient />
      </div>
    </div>
  );
}
