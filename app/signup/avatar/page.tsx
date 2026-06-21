import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { AvatarFlow } from "./AvatarFlow";

export const metadata = { title: "Proteggiti, Ward" };

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
  const { data: prof } = await admin.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();
  const kycDone = prof?.kyc_status === "approved";

  return <AvatarFlow existing={existing} kycDone={kycDone} />;
}
