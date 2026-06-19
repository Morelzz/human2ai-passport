import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { WardApp } from "./WardApp";
import { DEMO_WARD } from "./demo";

// App Ward (protezione). Per ora gate solo su login; il legame con l'avatar
// protetto reale e i dati veri arrivano con lo scan engine. Dati DEMO.
export default async function WardPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <WardApp data={DEMO_WARD} />;
}
