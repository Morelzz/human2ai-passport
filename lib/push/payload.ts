// Costruzione del contenuto delle notifiche push. Logica pura, niente IO:
// cosi' il testo degli avvisi e' testabile e coerente. Nessun trattino lungo
// nei copy (regola Morelz).

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

// Avviso "Ward ha trovato copie del tuo volto". `count` = match nuovi trovati
// nella scansione. Il copy cambia tra singolare e plurale; opzionale l'handle
// dell'avatar per dare contesto a chi ne protegge piu' di uno.
export function buildDetectionPush(count: number, avatarHandle?: string): PushPayload {
  const n = Math.max(1, Math.floor(count));
  const chi = avatarHandle ? `di @${avatarHandle}` : "del tuo volto";
  const body =
    n === 1
      ? `Ward ha trovato una copia ${chi}. Aprila per decidere se rimuoverla con Nemesis.`
      : `Ward ha trovato ${n} copie ${chi}. Aprile per decidere quali rimuovere con Nemesis.`;
  return {
    title: n === 1 ? "Trovata una copia" : `Trovate ${n} copie`,
    body,
    url: "/ward",
    // Stesso tag per avatar: un nuovo esito aggiorna l'avviso invece di accumularne.
    tag: avatarHandle ? `ward-detection-${avatarHandle}` : "ward-detection",
  };
}

// Notifica di prova, inviata subito dopo che l'utente attiva gli avvisi: serve
// a confermare con i propri occhi che funzionano.
export function buildTestPush(): PushPayload {
  return {
    title: "Avvisi attivi",
    body: "Da ora ti avviso qui quando Ward trova una copia del tuo volto.",
    url: "/ward",
    tag: "semblic-test",
  };
}
