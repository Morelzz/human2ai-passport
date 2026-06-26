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
  "spotify.com",
];

// I CDN dove le piattaforme servono DAVVERO le immagini: hanno un dominio
// diverso dalla vetrina (media.licdn.com non finisce con linkedin.com), quindi
// la lista vetrina da sola li manca. Tutti host reali visti in scan veri.
export const KNOWN_PLATFORM_CDNS = [
  "fbcdn.net",        // Facebook / Instagram
  "cdninstagram.com", // Instagram
  "licdn.com",        // LinkedIn
  "twimg.com",        // Twitter / X
  "pinimg.com",       // Pinterest
  "ytimg.com",        // YouTube
  "ggpht.com",        // YouTube / Google
  "redd.it", "redditmedia.com", "redditstatic.com", // Reddit
  "scdn.co",          // Spotify
  "vimeocdn.com",     // Vimeo
  "staticflickr.com", // Flickr
  "wikimedia.org",    // Wikipedia / Wikimedia
];

export function domainReputation(host: string | null | undefined): Reputation {
  if (!host) return "obscure";
  const h = host.toLowerCase().replace(/^www\./, "");
  // Match per dominio ESATTO o suffisso di sottodominio (mai sottostringa). Una
  // presenza su vetrina nota O sul suo CDN = 'exposed'.
  const isKnown = (d: string) => h === d || h.endsWith("." + d);
  const known = KNOWN_PLATFORMS.some(isKnown) || KNOWN_PLATFORM_CDNS.some(isKnown);
  return known ? "exposed" : "obscure";
}
