import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { diditConfigured } from "@/lib/kyc/didit";
import { AvatarFlow } from "./AvatarFlow";

export const metadata = { title: "Proteggiti, protezione identita" };

// /signup/avatar (spec B2): la porta "Avatar". Richiede l'accesso (l'identita va
// legata a un account). ?existing=1 = "Hai gia un avatar" -> solo consenso.
export default async function AvatarSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ existing?: string }>;
}) {
  const sp = await searchParams;
  const existing = sp?.existing === "1";

  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const next = existing ? "/signup/avatar?existing=1" : "/signup/avatar";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const admin = createServerClient();
  // "Hai gia un avatar" (existing=1) attiva col solo consenso: ha senso SOLO se
  // esiste gia' un'identita protetta (il faceprint c'e'). Altrimenti si va al
  // flusso protetto a registrarla, evitando il vicolo cieco 409 in attivazione.
  if (existing) {
    const { data: prot } = await admin
      .from("avatars")
      .select("id")
      .eq("owner_id", user.id)
      .eq("protection_only", true)
      .limit(1);
    if (!prot?.[0]) redirect("/signup/avatar/protected");
  }

  const { data: prof } = await admin.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();

  return <AvatarFlow existing={existing} kycStatus={prof?.kyc_status ?? "none"} diditEnabled={diditConfigured()} />;
}
