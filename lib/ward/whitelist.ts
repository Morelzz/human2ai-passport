// Whitelist di Ward v2: un risultato messo in whitelist NON compare piu' nei
// risultati, resta solo nel tab dedicato. Voci per HOST (tutto il dominio
// sicuro) o per URL (solo quella occorrenza; una nuova ripubblicazione = nuovo
// url = ricompare). Puro: lavora su qualsiasi oggetto con host/sourceUrl/pageUrl.
export type AllowEntry = { type: "host" | "url"; value: string };
type HasUrls = { sourceUrl: string; pageUrl: string | null; host: string | null };

export function isWhitelisted(find: HasUrls, entries: AllowEntry[]): boolean {
  const host = (find.host ?? "").toLowerCase().replace(/^www\./, "");
  return entries.some((e) => {
    if (e.type === "host") {
      const v = e.value.toLowerCase().replace(/^www\./, "");
      return host === v || host.endsWith("." + v);
    }
    return find.sourceUrl === e.value || find.pageUrl === e.value;
  });
}

export function splitByWhitelist<T extends HasUrls>(
  finds: T[],
  entries: AllowEntry[],
): { visible: T[]; whitelisted: T[] } {
  const visible: T[] = [];
  const whitelisted: T[] = [];
  for (const f of finds) (isWhitelisted(f, entries) ? whitelisted : visible).push(f);
  return { visible, whitelisted };
}
