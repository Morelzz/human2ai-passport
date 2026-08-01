// Dominio pubblico canonico del sito. Vive qui (fonte unica usata da
// layout/robots/sitemap/og e api-filter). Override possibile via env.
export const CANONICAL_SITE_URL = "https://semblic.com";

// URL pubblico del sito, risolto in ordine di affidabilità:
//  1. NEXT_PUBLIC_SITE_URL — override esplicito via env (per cambiare dominio)
//  2. CANONICAL_SITE_URL (semblic.com) — su qualsiasi deploy Vercel, segnalato
//     da VERCEL_PROJECT_PRODUCTION_URL (valorizzato solo sui deploy Vercel).
//     Forziamo il dominio reale invece dell'host *.vercel.app, così
//     metadataBase / og:image / sitemap / robots / canonical sono corretti.
//  3. localhost — sviluppo locale
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return CANONICAL_SITE_URL;
  return "http://localhost:3000";
}

// A4 — social. Handle Instagram UFFICIALE (confermato da Morelz, 2026-06-10).
// URL pulito senza parametri di condivisione/tracking. Un solo punto di verità
// (lo usano la home e il sameAs dell'Organization nel layout).
export const INSTAGRAM_HANDLE = "semblic";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;
