// Sentry arriva solo se c'e' un DSN, e dopo la pagina (27/9/2026): prima pesava
// 38 KB prima dell'idratazione anche senza DSN. Gli errori dei primissimi
// istanti possono sfuggire: e' il prezzo accettato.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Promise.all([import("@sentry/nextjs"), import("@/lib/sentry-scrub")]).then(([Sentry, { scrubEvent }]) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: (event) => scrubEvent(event),
    });
  });
}
