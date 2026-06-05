import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import ReviewClient from "./ReviewClient";

// Coda di revisione manuale — riservata agli operatori (role 'admin').
export default async function ReviewPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/account");

  return <ReviewClient />;
}
