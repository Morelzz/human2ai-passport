import { cookies } from "next/headers";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { Navbar } from "./Navbar";
import { CONTENTS_SEEN_COOKIE } from "@/lib/contents-seen";

// Nav condivisa per tutto il sito: recupera la sessione lato server e passa
// il nome alla Navbar (client, con hamburger). Drop-in in qualsiasi pagina.
export async function SiteNav() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();

  let firstName: string | null = null;
  let unseen = 0;
  if (user) {
    const { data: profile } = await auth.from("profiles").select("full_name").eq("id", user.id).single();
    const full = profile?.full_name || user.email || "";
    firstName = full ? String(full).trim().split(/\s+/)[0] : "Account";

    // Notifiche "+N": generazioni con certificato completate DOPO l'ultima visita
    // a "I miei contenuti" (cookie). Senza cookie, conta tutte le esistenti.
    const seenIso = (await cookies()).get(CONTENTS_SEEN_COOKIE)?.value ?? "1970-01-01";
    const admin = createServerClient();
    const { count } = await admin
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .eq("mode", "commercial")
      .not("certificate", "is", null)
      .gt("created_at", seenIso);
    unseen = count ?? 0;
  }

  return <Navbar firstName={firstName} unseen={unseen} />;
}
