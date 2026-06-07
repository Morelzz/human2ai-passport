import { createAuthClient } from "@/lib/supabase-auth";
import { Navbar } from "./Navbar";

// Nav condivisa per tutto il sito: recupera la sessione lato server e passa
// il nome alla Navbar (client, con hamburger). Drop-in in qualsiasi pagina.
export async function SiteNav() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();

  let firstName: string | null = null;
  if (user) {
    const { data: profile } = await auth.from("profiles").select("full_name").eq("id", user.id).single();
    const full = profile?.full_name || user.email || "";
    firstName = full ? String(full).trim().split(/\s+/)[0] : "Account";
  }

  return <Navbar firstName={firstName} />;
}
