/* Service worker SEMBLIC.
 * Due compiti: (1) rendere installabile la PWA (presenza del SW + manifest),
 * (2) ricevere le notifiche push degli avvisi Ward e portare l'utente al radar.
 * Volutamente minimale: niente cache offline aggressiva (l'app e' dinamica e
 * auth-gated, una cache stantia farebbe piu' danni che bene).
 */

// Attivazione immediata: niente attesa che le vecchie tab si chiudano.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Ricezione push: il server manda un JSON { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Semblic";
  const options = {
    body: data.body || "",
    icon: "/logo-shield.png",
    badge: "/semblic-mark.png",
    tag: data.tag || "semblic",
    // Riapre/raggruppa per tag: un nuovo avviso aggiorna il precedente.
    renotify: Boolean(data.tag),
    data: { url: data.url || "/ward" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click sulla notifica: porta (o focalizza) la tab sul radar Ward.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/ward";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
