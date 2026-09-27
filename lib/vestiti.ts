// ──────────────────────────────────────────────────────────────────────────
// I VESTITI DI OGNUNO (27/9/2026). Nella pagina Crea ogni persona ha il suo
// campo "cosa indossa". Qui diventano frasi della scena, PRIMA del resto:
// cosi' non si perdono mai in fondo a una scena lunga (il 27/9 i vestiti
// stavano oltre il taglio e il motore non li ha mai letti) e passano anche
// dalle regole della persona, perche' finiscono nel testo che le regole leggono.
// Nel gruppo ogni frase dice a chi appartiene, con la posizione da sinistra:
// senza, il motore mescolava i capi fra le persone.
// Puro, senza import.
// ──────────────────────────────────────────────────────────────────────────

export const MAX_VESTITI = 160; // caratteri per persona
const POSTO = ["first", "second", "third", "fourth"];

function pulisci(v: unknown): string {
  return String(v ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_VESTITI).replace(/[.;,\s]+$/, "");
}

/** I vestiti dal corpo della richiesta: una stringa (scatto singolo) o un elenco (gruppo). */
export function vestitiDa(raw: unknown, persone: number): string[] {
  const lista = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  return lista.slice(0, Math.max(1, persone)).map(pulisci);
}

/** La scena con i vestiti davanti. Nessun vestito: la scena resta com'e'. */
export function scenaConVestiti(scena: string, vestiti: string[], gruppo: boolean): string {
  const frasi = vestiti
    .map((v, i) => (!v ? "" : gruppo ? `Person ${i + 1} (${POSTO[i]} from the left) wears ${v}.` : `The person wears ${v}.`))
    .filter(Boolean);
  if (!frasi.length) return scena;
  return `${frasi.join(" ")} ${scena}`.trim();
}
