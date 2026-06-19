// Rimuove ogni dato potenzialmente sensibile prima dell'invio a Sentry.
// Mai volti, token, email, cookie, body di richiesta.
// Generico: accetta e ritorna lo STESSO tipo dell'evento (muta in place), cosi'
// soddisfa il contratto di beforeSend senza accoppiarsi ai tipi interni di Sentry.
export function scrubEvent<T>(event: T): T {
  const e = event as unknown as {
    request?: { data?: unknown; cookies?: unknown; query_string?: unknown; headers?: Record<string, unknown> };
    user?: { email?: string; ip_address?: string };
  };
  if (e.request) {
    delete e.request.data;
    delete e.request.cookies;
    delete e.request.query_string;
    if (e.request.headers) {
      delete e.request.headers["authorization"];
      delete e.request.headers["cookie"];
    }
  }
  if (e.user) {
    delete e.user.email;
    e.user.ip_address = undefined;
  }
  return event;
}
