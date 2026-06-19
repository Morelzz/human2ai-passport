// WHOIS via RDAP (HTTP/JSON, niente porta 43): registrar, date, nameserver per
// l'host di un match. Riassunto compatto -> colonna jsonb whois. fetch
// iniettabile per i test; non lancia mai (best-effort).

export interface WhoisSummary {
  domain: string | null;
  registrar: string | null;
  created: string | null;
  expires: string | null;
  nameservers: string[];
  status: string[];
  source: "rdap" | "none";
}

// Euristica semplice: ultimi due label (cdn.unknown-host.ru -> unknown-host.ru).
// Non gestisce gli SLD multi-livello (co.uk), sufficiente per il riassunto Module 1.
export function registrableDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<any> }>;

export async function rdapLookup(
  host: string,
  fetchFn: FetchLike = fetch as unknown as FetchLike,
): Promise<WhoisSummary> {
  const domain = registrableDomain(host);
  const empty: WhoisSummary = {
    domain: domain || null,
    registrar: null,
    created: null,
    expires: null,
    nameservers: [],
    status: [],
    source: "none",
  };
  if (!domain) return empty;
  try {
    const res = await fetchFn(`https://rdap.org/domain/${domain}`);
    if (!res.ok) return empty;
    const j = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reg = (j.entities ?? []).find((e: any) => (e.roles ?? []).includes("registrar"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = reg?.vcardArray?.[1]?.find((f: any) => f[0] === "fn");
    const registrar = (fn?.[3] as string) ?? reg?.handle ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ev = (j.events ?? []) as any[];
    const created = ev.find((e) => e.eventAction === "registration")?.eventDate ?? null;
    const expires = ev.find((e) => e.eventAction === "expiration")?.eventDate ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nameservers = ((j.nameservers ?? []) as any[]).map((n) => n.ldhName).filter(Boolean);
    const status = (j.status ?? []) as string[];
    return { domain, registrar, created, expires, nameservers, status, source: "rdap" };
  } catch {
    return empty;
  }
}
