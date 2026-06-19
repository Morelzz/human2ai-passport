import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import SignupForm from "./SignupForm";

// Guardia: un utente GIA' loggato non deve MAI vedere "Crea il tuo account".
// Era la causa radice del loop "mi rifa fare l'account di continuo": /signup e'
// raggiunto da piu' bottoni del sito (Audiences, ClosingCTA, Prezzi, ...) e
// mostrava il form di registrazione anche a chi era gia' dentro. Se c'e' gia'
// una sessione, dritto all'account.
export default async function SignupPage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/account");

  return <SignupForm />;
}
