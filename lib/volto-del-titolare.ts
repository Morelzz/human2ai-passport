// ──────────────────────────────────────────────────────────────────────────
// IL VOLTO DEL TITOLARE (23/9/2026). Molte rotte cercavano "il" volto di chi
// e' entrato con .eq("owner_id", ...).maybeSingle(). Con DUE volti dello
// stesso titolare (l'account demo ha random + ward-demo, un'agenzia ne ha
// molti) maybeSingle() torna errore e data null: la pagina del consenso
// rimandava all'account e la revoca rispondeva "Nessun avatar da gestire".
// Chi non puo' revocare il consenso e' il guasto peggiore che abbiamo.
//
// Regola unica: se arriva un handle si usa quello, solo se e' del titolare.
// Altrimenti si sceglie il volto che conta: prima chi concede (non la sola
// protezione), poi chi non si e' ritirato, poi il piu' usato, poi il primo.
// ──────────────────────────────────────────────────────────────────────────

export interface VoltoCandidato {
  handle: string;
  protection_only?: boolean | null;
  revoked_at?: string | null;
  usage_count?: number | null;
  created_at?: string | null;
}

/** Il volto che conta tra quelli del titolare (null se non ne ha). */
export function scegliVolto<T extends VoltoCandidato>(volti: T[], opts: { soloProtezione?: boolean } = {}): T | null {
  const lista = opts.soloProtezione ? volti.filter((v) => v.protection_only) : volti;
  if (!lista.length) return null;
  const peso = (v: T) => [v.protection_only ? 1 : 0, v.revoked_at ? 1 : 0, -(v.usage_count ?? 0), v.created_at ?? ""] as const;
  return [...lista].sort((a, b) => {
    const pa = peso(a);
    const pb = peso(b);
    for (let i = 0; i < pa.length; i++) {
      if (pa[i] < pb[i]) return -1;
      if (pa[i] > pb[i]) return 1;
    }
    return 0;
  })[0];
}

/** Handle da query string o corpo: solo il formato di un handle, niente altro. */
export function handlePulito(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return /^[a-z0-9-]{1,63}$/.test(t) ? t : null;
}

type Admin = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Il volto del titolare, SERVER-ONLY. `campi` sono le colonne che servono alla
 * rotta (handle, protection_only, revoked_at, usage_count, created_at vengono
 * aggiunti da soli per scegliere). Con `handle` torna quel volto solo se e'
 * suo, altrimenti null: mai il volto di un altro.
 */
export async function voltoDelTitolare<T = Record<string, unknown>>(
  admin: Admin,
  ownerId: string,
  campi: string,
  opts: { handle?: string | null; soloProtezione?: boolean } = {},
): Promise<(T & VoltoCandidato) | null> {
  const colonne = Array.from(new Set([...campi.split(",").map((c) => c.trim()).filter(Boolean), "handle", "protection_only", "revoked_at", "usage_count", "created_at"])).join(", ");
  let q = admin.from("avatars").select(colonne).eq("owner_id", ownerId);
  if (opts.handle) q = q.eq("handle", opts.handle);
  const { data, error } = await q.limit(50);
  if (error || !data) return null;
  return scegliVolto(data as (T & VoltoCandidato)[], { soloProtezione: opts.soloProtezione });
}
