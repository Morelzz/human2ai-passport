// ──────────────────────────────────────────────────────────────────────────
// CARTELLE PROGETTO (22/9/2026). Chi lavora con Semblic non fa uno scatto: ne
// fa venti per una campagna, e poi deve farli vedere a qualcuno che non ha un
// account. Una cartella li raccoglie e, se il proprietario vuole, si apre con
// un indirizzo pubblico difficile da indovinare.
//
// Modulo PURO (niente rete): nomi, indirizzi e controlli si provano da soli.
// La tabella arriva da supabase/progetti.sql: finche' non e' applicata, le
// cartelle non esistono e il sito non se ne accorge (vedi progettiPronti).
// ──────────────────────────────────────────────────────────────────────────

export const MAX_NOME = 80;
export const MAX_CLIENTE = 80;
export const MAX_NOTA = 500;
export const MAX_CONTENUTI = 60; // quanti scatti ci stanno in una cartella

export interface Progetto {
  id: string;
  nome: string;
  cliente: string | null;
  nota: string | null;
  slug: string;
  link_attivo: boolean;
  created_at: string;
}

/** Ripulisce quello che scrive l'utente. Torna null se non resta niente. */
export function testoPulito(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}

/**
 * L'indirizzo pubblico. NON si ricava dal nome: un cliente non deve poter
 * indovinare la cartella di un altro provando "campagna-estate". Sono 24
 * caratteri casuali, e il nome resta solo una comodita' per chi legge il link.
 */
export function nuovoSlug(caso: () => string = () => Math.random().toString(36).slice(2)): string {
  let s = "";
  while (s.length < 24) s += caso().replace(/[^a-z0-9]/g, "");
  return s.slice(0, 24);
}

/** Il link da dare al cliente (vuoto se il proprietario l'ha spento). */
export function linkCliente(p: Pick<Progetto, "slug" | "link_attivo">, origin: string): string | null {
  return p.link_attivo ? `${origin.replace(/\/$/, "")}/p/${p.slug}` : null;
}

/** Quanti scatti si possono ancora aggiungere. */
export function postiLiberi(quanti: number): number {
  return Math.max(0, MAX_CONTENUTI - quanti);
}

/** Il sottotitolo della cartella: "3 scatti · per Barilla". */
export function riassunto(quanti: number, cliente: string | null): string {
  const scatti = `${quanti} ${quanti === 1 ? "scatto" : "scatti"}`;
  return cliente ? `${scatti} · per ${cliente}` : scatti;
}
