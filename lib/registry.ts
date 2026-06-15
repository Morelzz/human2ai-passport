import { createServerClient } from "@/lib/supabase";
import { Tier } from "@/lib/types";

// ── Fonte UNICA del registro pubblico (review blocco A: A2 + A4) ────────────
// Un avatar è "pubblico" se è APPROVATO. Tutte le superfici pubbliche — home,
// catalogo, trasparenza, /api/match, /api/filter — passano da qui, così i
// contatori "N volti" leggono la stessa lista (prima /trasparenza contava
// anche pending/rejected → "19 persone" contro i "18 volti" della home).
//
// Nota A2: i dati di test emersi dalla review (OKKIO, oiiii, Riccardo t.)
// erano signup reali rimasti `approved`: sono stati rimossi dal registro
// portandoli a `rejected` (vedi supabase/hide_test_signups.sql), la stessa
// semantica della sospensione admin. ATTENZIONE: i 15 volti del seed hanno
// `is_demo=true` (incluso Mario) e SONO il registro di presentazione finché
// non arrivano gli avatar reali (CLAUDE.md) — NON filtrare su is_demo.

type RegistryRow = {
  verification_status?: string | null;
  // Fase 2.1 (VETO): i volti in sola protezione NON compaiono in nessuna
  // superficie pubblica (esistono solo per il faceprint difensivo).
  protection_only?: boolean | null;
};

export type PublicAvatar = RegistryRow & {
  id: string;
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  usage_count: number | null;
  revoked_at: string | null;
  consent_start: string | null;
  is_demo?: boolean | null;
} & Record<string, unknown>;

export function isPublicAvatar(a: RegistryRow): boolean {
  // protection_only = registrazione inversa (VETO): mai pubblico, mai matchabile.
  return (a.verification_status ?? "approved") === "approved" && !a.protection_only;
}

// Tutti gli avatar del registro pubblico, ordinati per ingresso (consent_start).
// La tabella è piccola: una fetch unica, filtro e conteggi in memoria.
export async function getPublicAvatars(sb = createServerClient()): Promise<PublicAvatar[]> {
  const { data } = await sb.from("avatars").select("*").order("consent_start");
  return ((data ?? []) as PublicAvatar[]).filter(isPublicAvatar);
}
