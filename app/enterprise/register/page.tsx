import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import RegisterOrgClient from "./RegisterOrgClient";
import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";

export const metadata = {
  title: "Registra la tua agenzia",
  description:
    "Verifica la tua azienda (KYB) e onboarda il tuo roster di volti verificati nel registro Semblic.",
};

// KYB self-serve (Fase 3.2): porta d'ingresso per le agenzie. Un account loggato
// registra l'azienda; dopo l'approvazione KYB sblocca l'onboarding del roster.
export default async function EnterpriseRegisterPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Fenterprise%2Fregister");

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role ?? "buyer";

  // Già azienda con un'organizzazione registrata -> alla dashboard.
  if (role === "enterprise") {
    const admin = createServerClient();
    const { data: org } = await admin.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
    if (org) redirect("/account");
  }
  // Un Creatore/admin/manager non può convertirsi in agenzia da qui.
  const blocked = role !== "buyer" && role !== "enterprise";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <TestataTesto
          larghezza="max-w-3xl"
          occhiello="Enterprise, verifica dell'azienda"
          titolo="Registra la tua agenzia."
          sotto="Verifichiamo l'azienda (KYB) prima di darti accesso al tuo roster. È la stessa serietà del controllo d'identità che chiediamo alle persone: un volto entra nel registro solo se chi lo gestisce è verificato."
        />
        <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">

          {blocked ? (
            <div className="card mt-8 rounded-2xl border-blocked/50 p-6">
              <p className="text-sm font-semibold text-blocked">Questo account non può registrare un&apos;azienda</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Il tuo profilo è già un Creatore o un operatore. Usa un account dedicato all&apos;agenzia
                (una email aziendale) per registrare l&apos;organizzazione.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <RegisterOrgClient defaultEmail={user.email ?? ""} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
