// Guard SSRF per il proxy anteprima (/api/ward/preview). Il proxy scarica un URL
// salvato in scan_matches (origine Google Vision) e lo rilancia all'utente. Anche
// se l'URL non e' arbitrario (lo inserisce solo lo scan dai risultati Vision), per
// difesa in profondita' accettiamo SOLO http/https verso host PUBBLICI: mai
// loopback, IP privati, link-local (incl. il metadata endpoint cloud
// 169.254.169.254) o host interni. PURA e testabile.

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return false;
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127) return true;        // this-network / privata / loopback
  if (a === 169 && b === 254) return true;                   // link-local (incl. metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true;          // privata
  if (a === 192 && b === 168) return true;                   // privata
  return false;
}

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

  // IPv6 letterale: loopback, unique-local (fc00::/7), link-local (fe80::/10).
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return false;
    if (/^f[cd]/.test(host)) return false;
    if (host.startsWith("fe80")) return false;
    return true; // altro IPv6 pubblico
  }

  // IPv4 privati / loopback / link-local.
  if (isPrivateIpv4(host)) return false;

  return true;
}
