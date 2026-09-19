// Database finto per i test: tabelle in memoria e il sottoinsieme di query
// supabase-js che usano i moduli del server (select/update/eq/in/lt/not/order/limit).
export type Riga = Record<string, unknown>;
export function db(tabelle: Record<string, Riga[]>) {
  return {
    from(nome: string) {
      const righe = (tabelle[nome] ??= []);
      const filtri: ((r: Riga) => boolean)[] = [];
      let patch: Riga | null = null;
      let limite = Infinity;
      const q = {
        select: () => q,
        update: (p: Riga) => { patch = p; return q; },
        eq: (c: string, v: unknown) => { filtri.push((r) => r[c] === v); return q; },
        in: (c: string, v: unknown[]) => { filtri.push((r) => v.includes(r[c])); return q; },
        lt: (c: string, v: string) => { filtri.push((r) => typeof r[c] === "string" && (r[c] as string) < v); return q; },
        not: (c: string) => { filtri.push((r) => r[c] != null); return q; },
        order: () => q,
        limit: (n: number) => { limite = n; return q; },
        esegui() {
          const scelte = righe.filter((r) => filtri.every((f) => f(r))).slice(0, limite);
          if (patch) for (const r of scelte) Object.assign(r, patch);
          return { data: scelte, error: null };
        },
        maybeSingle: async () => { const { data } = q.esegui(); return { data: data[0] ?? null, error: null }; },
        then: (ok: (x: { data: Riga[]; error: null }) => unknown) => Promise.resolve(q.esegui()).then(ok),
      };
      return q;
    },
  };
}
