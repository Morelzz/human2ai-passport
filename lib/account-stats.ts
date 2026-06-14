import { createServerClient } from "@/lib/supabase";

// Statistiche revenue del creatore (dolore #1: le royalty non si vedevano).
// Tutto derivato dalle generations commerciali sul suo avatar: zero migrazioni.

export type UsageRow = {
  id: string;
  certificate: string | null;
  category: string | null;
  tier: string | null;
  royalty_cents: number | null;
  created_at: string;
};

export type RevenueStats = {
  last30Cents: number; // royalty maturata negli ultimi 30 giorni
  prev30Cents: number; // 30 giorni precedenti (per il delta)
  deltaPct: number | null; // variazione % (null se prima non c'era nulla)
  daily: { day: string; cents: number }[]; // serie giornaliera ultimi 30 giorni
  byCategory: { category: string; count: number; cents: number }[]; // ripartizione
  feed: UsageRow[]; // utilizzi recenti (per il feed filtrabile)
};

const DAY_MS = 24 * 60 * 60 * 1000;

// nowIso passato dall'esterno: Date.now() non è deterministico nei contesti
// dove gira questo codice; la pagina server passa la data corrente.
export async function revenueStatsFor(avatarId: string, now: Date): Promise<RevenueStats | null> {
  const admin = createServerClient();
  const since = new Date(now.getTime() - 60 * DAY_MS).toISOString();
  const { data, error } = await admin
    .from("generations")
    .select("id, certificate, category, tier, royalty_cents, created_at")
    .eq("avatar_id", avatarId)
    .eq("mode", "commercial")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) return null;
  const rows = (data ?? []) as UsageRow[];

  const cut30 = now.getTime() - 30 * DAY_MS;
  let last30 = 0;
  let prev30 = 0;
  const dailyMap = new Map<string, number>();
  const catMap = new Map<string, { count: number; cents: number }>();

  // 30 secchielli giornalieri inizializzati a 0 (grafico continuo anche nei vuoti)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    dailyMap.set(d, 0);
  }

  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const cents = r.royalty_cents ?? 0;
    if (t >= cut30) {
      last30 += cents;
      const key = r.created_at.slice(0, 10);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + cents);
      const cat = r.category ?? "Senza categoria";
      const cur = catMap.get(cat) ?? { count: 0, cents: 0 };
      catMap.set(cat, { count: cur.count + 1, cents: cur.cents + cents });
    } else {
      prev30 += cents;
    }
  }

  const deltaPct = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null;

  return {
    last30Cents: last30,
    prev30Cents: prev30,
    deltaPct,
    daily: [...dailyMap.entries()].map(([day, cents]) => ({ day, cents })),
    byCategory: [...catMap.entries()]
      .map(([category, v]) => ({ category, count: v.count, cents: v.cents }))
      .sort((a, b) => b.cents - a.cents),
    feed: rows.slice(0, 60), // il client filtra/pagina su questi
  };
}
