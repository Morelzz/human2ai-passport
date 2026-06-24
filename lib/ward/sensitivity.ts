// Classificazione di sensibilita' di una detection (Modulo 2, slice host-based).
// Un volto trovato su un sito per adulti va segnato 'sensitive' (la UI lo redige
// e lo mette in cima): e' tutela, non decorazione. PURA e testabile.
//
// CONSERVATIVA per scelta: meglio NON segnare che falsare un sito legittimo (es.
// "essex.com"/"middlesex" non sono adult). Quindi: lista curata di host noti +
// TLD adult + substring ad alta confidenza ("porn", che in un host e' quasi
// sempre adult) + match per SEGMENTO esatto sulle parole ambigue ("sex","nude").
// La classe 'minor' richiede analisi del contenuto/eta' e resta a valle (futuro).

export type Sensitivity = "standard" | "sensitive" | "minor";

// Host noti per adulti (match esatto o come suffisso di sottodominio).
const SENSITIVE_HOSTS = [
  "pornhub.com", "xvideos.com", "xhamster.com", "redtube.com", "youporn.com",
  "xnxx.com", "spankbang.com", "onlyfans.com", "fansly.com", "chaturbate.com",
  "stripchat.com", "brazzers.com", "motherless.com", "rule34.xxx", "e-hentai.org",
  "manyvids.com", "cam4.com", "bongacams.com",
];

// TLD a tematica adulta.
const SENSITIVE_TLDS = [".xxx", ".porn", ".sex", ".adult"];

// Parole ambigue: matchano solo come SEGMENTO esatto del dominio (separato da . o -),
// cosi' "sex" non colpisce "essex"/"sussex"/"middlesex".
const SENSITIVE_SEGMENTS = new Set([
  "sex", "nude", "nudes", "escort", "escorts", "camgirl", "camgirls", "hentai", "xxx", "nsfw",
]);

export function classifySensitivity(host: string | null | undefined): Sensitivity {
  if (!host) return "standard";
  const h = host.toLowerCase().replace(/^www\./, "");

  if (SENSITIVE_HOSTS.some((d) => h === d || h.endsWith("." + d))) return "sensitive";
  if (SENSITIVE_TLDS.some((t) => h.endsWith(t))) return "sensitive";
  // "porn" come substring e' quasi sempre adult (pornhub, pornsite, bestporn...),
  // e non compare in host legittimi comuni.
  if (h.includes("porn")) return "sensitive";

  const segments = h.split(/[.\-]/);
  if (segments.some((s) => SENSITIVE_SEGMENTS.has(s))) return "sensitive";

  return "standard";
}
