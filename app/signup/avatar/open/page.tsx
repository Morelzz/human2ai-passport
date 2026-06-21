import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Passo 3a (spec B2/E): ramo "Avatar APERTO" del fork. Pagina-ponte che riusa il
// flusso di creazione ESISTENTE (/account/avatar: 8 foto + identity kit +
// categorie + tier -> /api/avatar/create -> passport). Niente duplicazione.
// Garantisce solo i prerequisiti: scegliere l'avatar aperto significa diventare
// CREATORE, quindi se l'utente era "buyer" lo promuoviamo a "seller" (azione
// auto-iniziata e intenzionale). Senza KYC torna al Passo 1.
export default async function OpenAvatarBridge() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/signup/avatar/open");

  const { data: profile } = await auth
    .from("profiles")
    .select("role, kyc_status")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "enterprise") {
    // I privati creano un avatar solo da verificati: senza KYC, al Passo 1.
    if (profile?.kyc_status !== "approved") redirect("/signup/avatar");
    // Diventa creatore: promuove buyer -> seller (service role: l'utente non puo
    // cambiarsi il ruolo da solo sotto RLS).
    if (role === "buyer") {
      const admin = createServerClient();
      await admin.from("profiles").update({ role: "seller" }).eq("id", user.id);
    }
  }

  // Il flusso reale (guard ruolo+KYC, vincolo 1:1, cattura+licensing) vive qui.
  redirect("/account/avatar");
}
