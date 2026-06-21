import { createServerClient } from "@/lib/supabase";
import { monitoringConsentStatus } from "./consent";
import { wardGateState } from "./entitlement";
import { loadWardData } from "./load-server";
import type { WardData } from "../../app/ward/demo";

// Risolve lo stato del cancello Ward per la pagina /ward (spec B3). Server-only.
// locked -> 3 pannelli; demo -> tool in modalita demo; full -> tool reale + dati.
export type WardEntitlement =
  | { state: "locked" }
  | { state: "demo"; avatarId: string }
  | { state: "full"; avatarId: string; data: WardData };

export async function loadWardEntitlement(userId: string | null): Promise<WardEntitlement> {
  if (!userId) return { state: "locked" };

  const admin = createServerClient();
  // Ward riguarda SOLO le identita protette (protection_only): il faceprint
  // difensivo e il monitoraggio esistono solo per loro. Un avatar aperto non e'
  // monitorabile da Ward (l'attivazione richiede protection_only), quindi senza
  // un avatar protetto lo stato e' "locked" (si vedono i 3 pannelli, incluso
  // "Proteggiti ora"), MAI "demo" che porterebbe a un vicolo cieco in attivazione.
  const { data: avatars } = await admin
    .from("avatars")
    .select("id, created_at")
    .eq("owner_id", userId)
    .eq("protection_only", true)
    .order("created_at", { ascending: true })
    .limit(1);
  const avatar = avatars?.[0];
  if (!avatar) return { state: "locked" };
  const avatarId = avatar.id as string;

  const { data: consent } = await admin
    .from("monitoring_consents")
    .select("scope, on_match, open_web, granted_at, expires_at, revoked_at")
    .eq("avatar_id", avatarId)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const monitoring = monitoringConsentStatus(consent ?? null, new Date().toISOString());
  const state = wardGateState({ loggedIn: true, hasAvatar: true, monitoring });

  if (state === "full") {
    // Carica i dati reali; se per qualche ragione fallisce, degrada a demo
    // (non si mostra mai una pagina rotta).
    const real = await loadWardData(userId).catch(() => null);
    if (real) return { state: "full", avatarId: real.avatarId, data: real.data };
    return { state: "demo", avatarId };
  }
  return { state: "demo", avatarId };
}
