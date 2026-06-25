import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { diditConfigured } from "@/lib/kyc/didit";
import { ProtectedFlow } from "./ProtectedFlow";

export const metadata = { title: "Identita protetta, Ward" };

// /signup/avatar/protected (spec C2 pannello 3 + E/F3): flusso protetto vero.
// KYC gratis -> foto del volto -> consenso -> Ward attivo. Richiede l'accesso.
export default async function ProtectedSignupPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/signup/avatar/protected")}`);

  const admin = createServerClient();
  const { data: prof } = await admin.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();

  return <ProtectedFlow kycStatus={prof?.kyc_status ?? "none"} diditEnabled={diditConfigured()} />;
}
