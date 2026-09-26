// ──────────────────────────────────────────────────────────────────────────
// IL PERCORSO INTERNO, UNA REGOLA SOLA (27/9/2026). Dopo il login o la
// registrazione si torna a ?next=... . Il controllo di prima guardava solo
// l'inizio ("/" si', "//" e "/\" no), ma "/<TAB>/sito-esterno" passava: il
// browser butta via tab e a capo dentro un URL e lo legge come
// "//sito-esterno", cioe' un altro sito. Un link di phishing su semblic.com
// mandava la vittima fuori subito dopo un login vero.
//
// Adesso: niente spazi, caratteri di controllo o backslash in nessun punto, e
// il risultato si risolve davvero come URL e deve restare sullo stesso sito.
// PURA e provata (percorso-interno.test.ts).
// ──────────────────────────────────────────────────────────────────────────

const BASE = "https://semblic.invalid";

export function percorsoInterno(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.length > 2000) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000- \u007f\\]/.test(raw)) return null;
  if (raw.startsWith("//")) return null;
  let u: URL;
  try {
    u = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (u.origin !== BASE) return null;
  return u.pathname + u.search + u.hash;
}
