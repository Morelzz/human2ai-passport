import type { createServerClient } from "@/lib/supabase";
import { normalizeIdentity, scoreAvatar, type ScorableAvatar } from "@/lib/matching";

// E3 — log di OGNI ricerca di match (tabella match_searches). Best-effort e
// fire-and-forget come blocked_requests: la ricerca è la funzione vitale, il
// log è osservabilità della domanda — se la tabella manca o l'insert fallisce,
// il match non deve accorgersene. Nessun dato personale: solo la forma della
// domanda (attributi identikit, categoria, esito), mai chi cerca.

type Admin = ReturnType<typeof createServerClient>;

export interface SearchEvent {
  attrs?: Record<string, unknown> | null;
  category?: string | null;
  matched: boolean;
  resultsCount: number;
}

export function logMatchSearch(admin: Admin, ev: SearchEvent): void {
  void admin
    .from("match_searches")
    .insert({
      attrs: ev.attrs ?? null,
      category: ev.category ?? null,
      matched: ev.matched,
      results_count: ev.resultsCount,
    })
    .then(({ error }) => {
      if (error) console.warn("[match_searches] log fallito:", error.message);
    });
}

// La domanda reale vista da UN avatar: quante ricerche degli ultimi `days`
// giorni erano compatibili con la sua identità, e quante di queste chiedevano
// una categoria che lui non concede. La compatibilità riusa scoreAvatar (la
// stessa logica del match vero, categoria esclusa: si valuta a parte).
export interface DemandSummary {
  compatible: number; // ricerche compatibili con l'identità dell'avatar
  notGranted: number; // di queste, in categorie che l'avatar non concede
  days: number;
}

// Difensivo: se la migrazione match_searches.sql non è applicata torna null
// e la card nel hub creatore semplicemente non compare.
export async function demandForAvatar(
  admin: Admin,
  avatar: ScorableAvatar,
  days = 7,
): Promise<DemandSummary | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { data, error } = await admin
    .from("match_searches")
    .select("attrs, category")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error || !data) return null;

  let compatible = 0;
  for (const row of data) {
    const attrs = normalizeIdentity(row.attrs);
    if (!scoreAvatar(avatar, attrs).allowed) continue;
    compatible++;
  }
  // Modello senza categorie (Fase 2): non esiste più "uso non concesso" per
  // categoria. Chi è compatibile ed è consenziente è interamente concesso, quindi
  // notGranted resta 0 (il campo sparirà dalla card creatore con la Fase 4).
  return { compatible, notGranted: 0, days };
}
