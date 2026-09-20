import { headers } from "next/headers";

// Misura delle visite (Vercel Web Analytics): niente cookie, niente
// identificatori, nessun dato personale, quindi non entra nel banner e non
// cambia il consenso. Lo script arriva dal NOSTRO dominio (/_vercel/insights),
// quindi nessuna terza parte nella CSP; il nonce lo passa il proxy.
// Solo in produzione: in locale non sporchiamo i numeri. Se la misura non e'
// ancora accesa nel pannello Vercel, lo script semplicemente non esiste e la
// pagina non ne risente.
export async function VercelAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script defer nonce={nonce} src="/_vercel/insights/script.js" />;
}
