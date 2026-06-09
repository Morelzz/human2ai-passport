import type { createServerClient } from "@/lib/supabase";

// Log di una richiesta BLOCCATA dal filtro del consenso (tabella
// blocked_requests). Best-effort e fire-and-forget: il blocco è la funzione
// vitale, il log è osservabilità — se la tabella manca o l'insert fallisce,
// il gate non deve accorgersene. Nessun dato personale: solo la forma della
// domanda (categoria, motivo, attributi generici dell'identikit).

type Admin = ReturnType<typeof createServerClient>;

export interface BlockedEvent {
  source: "match" | "generate";
  reason: "no_match" | "category_excluded" | "category_not_approved" | "revoked";
  category?: string | null;
  attrs?: Record<string, unknown> | null;
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
