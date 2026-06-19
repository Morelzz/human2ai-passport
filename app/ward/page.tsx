import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { WardApp } from "./WardApp";
import { DEMO_WARD } from "./demo";
import { loadWardData } from "@/lib/ward/load-server";

// Per ora la UI gira sui dati DEMO (CLAUDE.md: demo finche' non si decide di
// passare ai dati reali). Il percorso reale e' gia' pronto dietro il flag
// WARD_REAL_DATA=1: quando c'e' la chiave Vision e gli scan producono match si
// accende senza altro codice. Fallback a demo se l'utente non ha un avatar o se
// il caricamento fallisce (non rompe mai la pagina).
export default async function WardPage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const real =
    process.env.WARD_REAL_DATA === "1" ? await loadWardData(user.id).catch(() => null) : null;

  return real ? (
    <WardApp data={real.data} scanAvatarId={real.avatarId} />
  ) : (
    <WardApp data={DEMO_WARD} />
  );
}
