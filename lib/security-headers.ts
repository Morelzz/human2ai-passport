// Header di sicurezza statici (validi per ogni risposta). La CSP NON e' qui:
// e' dinamica (nonce per-richiesta) e vive nel proxy. Sorgente unica cosi'
// next.config e gli eventuali test leggono lo stesso elenco.
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  // Forza HTTPS per 2 anni, sottodomini inclusi (semblic.com).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Niente sniffing del content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti clickjacking di base (la CSP frame-ancestors e' la difesa moderna).
  { key: "X-Frame-Options", value: "DENY" },
  // Non perdere il referrer verso terze parti.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Spegne API potenti del browser; la fotocamera resta SOLO same-origin (scansione volto).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
