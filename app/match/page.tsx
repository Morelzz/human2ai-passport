import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import MatchClient from "./MatchClient";

export default async function MatchPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  return <MatchClient />;
}
