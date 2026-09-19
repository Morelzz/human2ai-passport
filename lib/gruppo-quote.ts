import type { createServerClient } from "@/lib/supabase";

type Admin = ReturnType<typeof createServerClient>;

// Scene di gruppo (supabase/gruppi.sql): la parte di ogni persona sta in
// generation_people, non in generations.royalty_cents (che e' il totale).
// Chi guarda i numeri di un volto deve vedere la SUA parte, anche nelle foto
// dove non e' il primo da sinistra. Tabella assente = nessuna scena di gruppo.

export interface QuotaGruppo { generation_id: string; avatar_id: string; royalty_cents: number }

export async function quoteDi(admin: Admin, avatarIds: string[]): Promise<QuotaGruppo[]> {
  if (avatarIds.length === 0) return [];
  const { data, error } = await admin
    .from("generation_people")
    .select("generation_id, avatar_id, royalty_cents")
    .in("avatar_id", avatarIds);
  if (error || !data) return [];
  return data as QuotaGruppo[];
}

// Righe di generations viste da un gruppo di volti: la royalty diventa la somma
// delle loro parti, e si aggiungono le foto di gruppo dove non sono i primi.
export async function conQuoteDiGruppo<R extends { id: string; royalty_cents: number | null; created_at: string }>(
  righe: R[],
  quote: QuotaGruppo[],
  carica: (ids: string[]) => Promise<R[]>,
): Promise<R[]> {
  if (quote.length === 0) return righe;
  const parte = new Map<string, number>();
  for (const q of quote) parte.set(q.generation_id, (parte.get(q.generation_id) ?? 0) + q.royalty_cents);
  const out = righe.map((r) => (parte.has(r.id) ? { ...r, royalty_cents: parte.get(r.id)! } : r));
  const mancanti = [...parte.keys()].filter((id) => !out.some((r) => r.id === id));
  if (mancanti.length) {
    for (const r of await carica(mancanti)) out.push({ ...r, royalty_cents: parte.get(r.id) ?? 0 });
    out.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  }
  return out;
}
