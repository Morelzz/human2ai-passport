import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

export function register() {
  if (!process.env.SENTRY_DSN) return; // nessuna DSN -> no-op (Sentry inerte)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRequestError = Sentry.captureRequestError;
