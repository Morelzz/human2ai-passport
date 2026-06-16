import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import RegisterOrgClient from "./RegisterOrgClient";

export const metadata = {
  title: "Registra la tua agenzia",
  description:
    "Verifica la tua azienda (KYB) e onboarda il tuo roster di volti verificati nel registro Human2AI.",
};

// KYB self-serve (Fase 3.2): porta d'ingresso per le agenzie. Un account loggato
// registra l'azienda; dopo l'approvazione KYB sblocca l'onboarding del roster.
export default async function EnterpriseRegisterPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

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
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <section className="mx-auto max-w-2xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
          <span className="label-mono text-crimson-light">Enterprise · KYB</span>
          <h1 className="mt-4 text-balance text-3xl font-extralight leading-[1.05] tracking-[-0.03em] sm:text-4xl">
            Registra la tua agenzia.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            Verifichiamo l&apos;azienda (KYB) prima di darti accesso all&apos;onboarding del roster.
            È la stessa serietà del controllo identità che chiediamo alle persone: un volto entra nel
            registro solo se chi lo gestisce è verificato.
          </p>

          {blocked ? (
            <div className="glass mt-8 rounded-2xl border-crimson/30 p-6">
              <p className="text-sm font-semibold text-crimson">Questo account non può registrare un&apos;azienda</p>
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
