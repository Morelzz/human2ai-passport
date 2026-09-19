import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import MessaggiClient from "./MessaggiClient";

// Messaggi dal modulo contatti, riservati agli operatori (role 'admin').
export default async function MessaggiPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Fmessaggi");
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/account");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <SiteNav />
        <MessaggiClient />
      </div>
    </div>
  );
}
