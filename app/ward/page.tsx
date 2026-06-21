import { createAuthClient } from "@/lib/supabase-auth";
import { WardApp } from "./WardApp";
import { WardEntry } from "./WardEntry";
import { DEMO_WARD } from "./demo";
import { loadWardEntitlement } from "@/lib/ward/entitlement-server";

// /ward (spec B3 + C2): pagina entitlement-aware dietro AvatarHolderGate.
//  - locked (visitatore / nessun avatar): i 3 pannelli d'ingresso (pubblico).
//  - demo (ha un avatar ma Ward non e' attivo): il tool in modalita demo, con
//    la CTA per attivare Ward sull'avatar esistente (consenso).
//  - full (avatar + monitoraggio attivo): il tool reale coi dati dell'utente.
export default async function WardPage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ent = await loadWardEntitlement(user?.id ?? null);

  if (ent.state === "locked") return <WardEntry />;
  if (ent.state === "full") return <WardApp data={ent.data} scanAvatarId={ent.avatarId} />;
  return <WardApp data={DEMO_WARD} demo demoCtaHref="/signup/avatar?existing=1" />;
}
