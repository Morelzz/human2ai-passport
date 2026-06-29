"use client";

// Helper lato browser per la PWA: registrazione service worker, rilevamento
// dello stato (installata, iOS) e iscrizione/disiscrizione alle notifiche push.
// Tutto difensivo: su browser senza supporto le funzioni degradano in modo
// pulito, non lanciano.

// L'app gira "installata" (a tutto schermo)?
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari espone navigator.standalone fuori standard.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// iPhone/iPad: l'install e' manuale (Condividi, Aggiungi a Home) e il push
// funziona SOLO da installata (iOS 16.4+).
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS recenti si spacciano per Mac: distingui dal touch.
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
  return iOSDevice || iPadOS;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Registra il service worker (idempotente). Restituisce la registration o null.
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

// La chiave VAPID arriva in base64url e va passata come Uint8Array a subscribe().
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // ArrayBuffer esplicito: serve a applicationServerKey (BufferSource), che non
  // accetta il tipo generico Uint8Array<ArrayBufferLike>.
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Chiede il permesso, si iscrive col PushManager e registra la subscription
// lato server. Ritorna true se ora gli avvisi sono attivi.
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = (await navigator.serviceWorker.ready) || (await registerServiceWorker());
  if (!reg) return false;

  // Chiave pubblica dal server (mai esposta al bundle).
  const keyRes = await fetch("/api/push/key");
  if (!keyRes.ok) return false;
  const { key } = (await keyRes.json()) as { key: string };
  if (!key) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) return false;

  // Notifica di prova: conferma visiva che funziona.
  await fetch("/api/push/test", { method: "POST" }).catch(() => {});
  return true;
}

// Disattiva gli avvisi su questo dispositivo.
export async function disablePush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
