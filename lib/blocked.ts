import type { createServerClient } from "@/lib/supabase";

// Log di una richiesta BLOCCATA dal filtro del consenso (tabella
// blocked_requests). Best-effort e fire-and-forget: il blocco è la funzione
// vitale, il log è osservabilità — se la tabella manca o l'insert fallisce,
// il gate non deve accorgersene. Nessun dato personale: solo la forma della
// domanda (categoria, motivo, attributi generici dell'identikit).

type Admin = ReturnType<typeof createServerClient>;

export interface BlockedEvent {
  source: "match" | "generate";
  reason: "no_match" | "category_excluded" | "category_not_approved" | "no_commercial_consent" | "revoked" | "protected_face" | "age_no_dob" | "age_under_18";
  category?: string | null;
  attrs?: Record<string, unknown> | null;
}

// Review C3 — blocchi del MESE corrente: fonte UNICA per l'hero della home e
// per /trasparenza (stesso numero, stessa query). Difensivo: se la migrazione
// blocked_requests.sql non è applicata il count è null → 0, mai un crash.
export async function countBlockedThisMonth(admin: Admin): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from("blocked_requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString());
  return count ?? 0;
}

export function logBlockedRequest(admin: Admin, ev: BlockedEvent): void {
  void admin
    .from("blocked_requests")
    .insert({
      source: ev.source,
      reason: ev.reason,
      category: ev.category ?? null,
      attrs: ev.attrs ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("[blocked_requests] log fallito:", error.message);
    });
}
