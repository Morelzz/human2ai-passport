// Guard SSRF per il proxy anteprima (/api/ward/preview). Il proxy scarica un URL
// salvato in scan_matches (origine Google Vision) e lo rilancia all'utente. Per
// difesa in profondita' accettiamo SOLO http/https verso host PUBBLICI: mai
// loopback, IP privati, link-local (incl. metadata cloud 169.254.169.254), host
// interni. Tre strati: (1) lessicale sull'URL, (2) DNS-resolve (un host pubblico
// non deve risolvere a un IP privato), (3) redirect seguiti A MANO e ri-validati.
import { lookup } from "node:dns/promises";

// Vero se l'IP (v4, v6, o IPv4-mapped ::ffff:a.b.c.d) e' privato / loopback /
// link-local / CGNAT. Un hostname (non IP) -> false. PURA.
export function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  let s = ip.trim().toLowerCase();
  // IPv4-mapped IPv6: forma dotted (::ffff:a.b.c.d) o esadecimale (::ffff:hhhh:hhhh,
  // come la normalizza il parser URL, es. ::ffff:a9fe:a9fe = 169.254.169.254).
  const mappedDotted = s.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedDotted) {
    s = mappedDotted[1];
  } else {
    const mappedHex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      s = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    }
  }

  const v4 = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return false;
    const [a, b] = o;
    if (a === 0 || a === 10 || a === 127) return true;     // this-network / privata / loopback
    if (a === 169 && b === 254) return true;                // link-local (metadata cloud)
    if (a === 172 && b >= 16 && b <= 31) return true;       // privata
    if (a === 192 && b === 168) return true;                // privata
    if (a === 100 && b >= 64 && b <= 127) return true;      // CGNAT 100.64/10
    return false;
  }

  if (s.includes(":")) { // IPv6 letterale
    if (s === "::1" || s === "::") return true;
    if (/^f[cd]/.test(s)) return true;     // fc00::/7 unique-local
    if (s.startsWith("fe80")) return true;  // link-local
    return false;
  }

  return false; // hostname, non un IP
}

// (1) Validazione LESSICALE: http/https + host non interno / IP privato letterale.
export function isSafeRemoteImageUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  let host = u.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1); // IPv6 letterale
  if (!host) return false;

  // Host interni / loopback per nome.
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;

  // IP letterale (v4 / v6 / IPv4-mapped): blocca privati, loopback, link-local.
  if (isPrivateIp(host)) return false;

  return true;
}

// (2) Risolve l'host e verifica che NESSUN IP risolto sia privato (anti
// DNS-rebinding / host pubblico che punta a IP interni). Lookup fallito o un IP
// privato -> false (fail-closed).
export async function isHostPublic(hostname: string): Promise<boolean> {
  let host = hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (!host) return false;
  try {
    const res = await lookup(host, { all: true });
    return res.length > 0 && res.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

const MAX_REDIRECTS = 3;

// (3) Fetch SICURO di un'immagine remota: ad ogni hop ri-valida l'URL (lessicale)
// e l'IP risolto (DNS), e segue i redirect A MANO (max 3) ri-validando il target.
// Lancia se un hop punta a un host non sicuro o se i redirect sono troppi: cosi'
// un redirect verso 169.254.169.254 / IP interni non viene mai seguito.
export async function fetchImageSafely(rawUrl: string, init?: { signal?: AbortSignal }): Promise<Response> {
  let url = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isSafeRemoteImageUrl(url)) throw new Error("URL non sicuro");
    if (!(await isHostPublic(new URL(url).hostname))) throw new Error("Host non pubblico");
    const res = await fetch(url, { redirect: "manual", signal: init?.signal });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect senza Location");
      url = new URL(loc, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("Troppi redirect");
}
