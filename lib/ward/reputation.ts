// Reputazione del dominio per il semaforo di Ward v2: 'exposed' = piattaforma
// conosciuta/esposta dove la presenza e' normale (giallo), 'obscure' = tutto il
// resto, da guardare per primo (rosso). E' un'euristica di PRIORITA', non un
// verdetto: la whitelist dell'utente la corregge. Puro, niente rete. Match per
// dominio ESATTO o suffisso di sottodominio (mai sottostringa, anti spoofing).
export type Reputation = "exposed" | "obscure";

export const KNOWN_PLATFORMS = [
  "instagram.com", "facebook.com", "x.com", "twitter.com", "tiktok.com",
  "youtube.com", "linkedin.com", "pinterest.com", "reddit.com", "tumblr.com",
  "threads.net", "snapchat.com", "twitch.tv", "vimeo.com", "flickr.com",
  "behance.net", "dribbble.com", "medium.com", "substack.com", "wikipedia.org",
];

export function domainReputation(host: string | null | undefined): Reputation {
  if (!host) return "obscure";
  const h = host.toLowerCase().replace(/^www\./, "");
  const known = KNOWN_PLATFORMS.some((d) => h === d || h.endsWith("." + d));
  return known ? "exposed" : "obscure";
}
