// URL pubblico del sito, risolto in ordine di affidabilità:
//  1. NEXT_PUBLIC_SITE_URL — dominio reale, impostato a mano (quando ci sarà)
//  2. VERCEL_PROJECT_PRODUCTION_URL — system env di Vercel, presente in prod
//  3. localhost — sviluppo
// Senza il fallback Vercel, metadataBase / og:image / sitemap / robots
// puntavano a localhost in produzione (bug reale visto sulle anteprime
// social dei passport: og:image = http://localhost:3000/...).
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
