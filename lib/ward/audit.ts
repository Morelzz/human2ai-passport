import { createServerClient } from "@/lib/supabase";

// Audit log append-only di Ward. Best-effort: l'audit non deve MAI bloccare
// l'azione che descrive (se l'insert fallisce, l'operazione prosegue). Solo
// service role scrive (la tabella e' lockata agli utenti, vedi RLS).
export interface AuditEntry {
  actor: string | null;        // uuid utente o null (azione di sistema/worker)
  action: string;              // es. "scan.consent_ok", "scan.consent_denied"
  target: string | null;       // es. avatar_id o match_id
  meta?: Record<string, unknown>;
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const admin = createServerClient();
  try {
    await admin.from("audit_log").insert({
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      meta: entry.meta ?? {},
    });
  } catch {
    /* best-effort: l'audit non blocca mai l'azione */
  }
}
