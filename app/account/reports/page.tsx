import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import ReportsClient from "./ReportsClient";

// Coda di moderazione delle segnalazioni — riservata agli operatori (role 'admin').
export default async function ReportsPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/account");

  return <ReportsClient />;
}
