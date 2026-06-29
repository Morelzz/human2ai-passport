import { createServerClient } from "@/lib/supabase";

// Persistenza delle subscription push (tabella push_subscriptions). Lato server
// con service role: il browser non scrive mai qui direttamente. Una riga per
// endpoint del browser/dispositivo; un utente puo' averne piu' di una.

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Salva (o aggiorna) la subscription per un utente. Upsert sull'endpoint:
// re-iscriversi dallo stesso dispositivo non crea duplicati.
export async function saveSubscription(
  userId: string,
  sub: WebPushSubscription,
  userAgent?: string
): Promise<void> {
  const admin = createServerClient();
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: userAgent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(`saveSubscription: ${error.message}`);
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Tutte le subscription attive di un utente (per inviare un avviso a tutti i
// suoi dispositivi).
export async function listSubscriptions(userId: string): Promise<StoredSubscription[]> {
  const admin = createServerClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw new Error(`listSubscriptions: ${error.message}`);
  return (data ?? []) as StoredSubscription[];
}

// Rimuove una subscription per endpoint. Usata sia dall'utente (disattiva
// avvisi) sia dal sender quando il push server risponde "endpoint scaduto".
export async function deleteSubscription(endpoint: string): Promise<void> {
  const admin = createServerClient();
  const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(`deleteSubscription: ${error.message}`);
}
