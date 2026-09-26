import { cookies } from "next/headers";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { Navbar } from "./Navbar";
import { CONTENTS_SEEN_COOKIE } from "@/lib/contents-seen";
import { voltBalance, LOW_BALANCE_THRESHOLD } from "@/lib/volt";

// Nav condivisa per tutto il sito: recupera la sessione lato server e passa
// il nome alla Navbar (client, con hamburger). Drop-in in qualsiasi pagina.
export async function SiteNav() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();

  let firstName: string | null = null;
  let unseen = 0;
  let volt: number | null = null; // null = VOLT non configurato: badge nascosto
  if (user) {
    // Notifiche "+N": generazioni con certificato completate DOPO l'ultima visita
    // a "I miei contenuti" (cookie). Senza cookie, conta tutte le esistenti.
    const seenIso = (await cookies()).get(CONTENTS_SEEN_COOKIE)?.value ?? "1970-01-01";
    const admin = createServerClient();
    // Le tre letture partono insieme (27/9/2026): una dopo l'altra tenevano ferma
    // la pagina 150-400 ms per chi e' entrato, in tutte le pagine con la nav.
    const [saldo, { data: profile }, { count }] = await Promise.all([
      voltBalance(user.id),
      auth.from("profiles").select("full_name").eq("id", user.id).single(),
      admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", user.id)
        .eq("mode", "commercial")
        .not("certificate", "is", null)
        .gt("created_at", seenIso),
    ]);
    volt = saldo;
    // Senza full_name si usa la parte locale dell'email (mai l'email intera in nav).
    const full = profile?.full_name?.trim() || user.email?.split("@")[0] || "";
    firstName = full ? String(full).trim().split(/\s+/)[0] : "Account";
    unseen = count ?? 0;
  }

  return <Navbar firstName={firstName} unseen={unseen} volt={volt} voltThreshold={LOW_BALANCE_THRESHOLD} />;
}
