import webpush from "web-push";
import type { PushPayload } from "./payload";
import { listSubscriptions, deleteSubscription, type StoredSubscription } from "./subscriptions";

// Invio delle notifiche push via VAPID. Le chiavi stanno in env (mai nel
// client, mai committate). Se mancano, l'invio e' un no-op silenzioso: la
// generazione/scansione NON deve fallire perche' il push non e' configurato.

let configured = false;
function ensureVapid(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:protezione@semblic.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

// Un endpoint va rimosso quando il push server dice che non esiste piu':
// 404 (Not Found) o 410 (Gone). Logica pura, isolata per i test.
export function shouldPruneSubscription(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export interface SendResult {
  sent: number;
  pruned: number;
  skipped: boolean; // true se VAPID non e' configurato
}

// Manda lo stesso payload a tutti i dispositivi di un utente. Best-effort:
// gli errori per singolo endpoint non bloccano gli altri, e gli endpoint
// scaduti vengono potati.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  if (!ensureVapid()) return { sent: 0, pruned: 0, skipped: true };

  let subs: StoredSubscription[] = [];
  try {
    subs = await listSubscriptions(userId);
  } catch {
    return { sent: 0, pruned: 0, skipped: false };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (shouldPruneSubscription(status)) {
          await deleteSubscription(s.endpoint).catch(() => {});
          pruned++;
        }
      }
    })
  );

  return { sent, pruned, skipped: false };
}
