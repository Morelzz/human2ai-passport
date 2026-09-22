// ──────────────────────────────────────────────────────────────────────────
// PROVALO SENZA REGISTRARTI (22/9/2026). Chi arriva su semblic.com deve
// credere sulla parola: per vedere cosa sa fare il motore servono account,
// email verificata e VOLT comprati. Tre porte prima della magia.
//
// Qui se ne toglie tre su tre: scegli un volto, scegli una scena, guarda. La
// foto esce con la filigrana bene in vista e non si scarica; per averla pulita
// serve l'account. E' quello che fa un fotografo quando ti fa vedere i provini.
//
// DUE REGOLE CHE NON SI TOCCANO:
//  1. SCENE CHIUSE. Sei scene scritte da noi. Nessuno scrive quello che vuole
//     su un volto vero senza nemmeno un account: e' la porta da cui entrano i
//     guai, e non la apriamo.
//  2. LA PERSONA VIENE PAGATA LO STESSO, dalla tasca di Semblic. Se una prova
//     non paga, la frase "ogni utilizzo paga la persona" smette di essere vera,
//     e quella frase e' il prodotto.
//
// L'interruttore e' PROVA_GRATIS=1. Senza, la prova non esiste: niente fascia
// in home, niente pagina, e la rotta risponde "non attiva". Il tetto di spesa
// non e' un numero scritto nel codice: e' il saldo VOLT dell'account di
// servizio (PROVA_ACCOUNT). Finiti i VOLT, finiscono le prove.
// Modulo PURO: si prova senza rete.
// ──────────────────────────────────────────────────────────────────────────

export interface ScenaProva {
  v: string; // chiave che arriva dal client
  l: string; // come si legge
  prompt: string; // quello che va al motore, in inglese come tutti i nostri prompt
}

export const SCENE: ScenaProva[] = [
  { v: "moda", l: "In un set di moda", prompt: "posing on a professional fashion photography set, soft studio lighting, seamless backdrop, editorial look" },
  { v: "bar", l: "Al bar, la mattina", prompt: "sitting at a small table of an italian cafe in the morning, warm natural light, cup of coffee on the table" },
  { v: "ufficio", l: "In ufficio", prompt: "in a bright modern office, sitting at a desk with a laptop, large windows, natural daylight" },
  { v: "palco", l: "Sul palco", prompt: "on a concert stage holding a microphone, warm stage lights from behind, blurred crowd far in the background" },
  { v: "spiaggia", l: "In spiaggia al tramonto", prompt: "walking on a quiet beach at sunset, warm golden light, sea in the background" },
  { v: "studio", l: "Ritratto in studio", prompt: "studio portrait on a neutral grey background, soft key light, shallow depth of field" },
];

export function scenaProva(v: unknown): ScenaProva | null {
  return SCENE.find((s) => s.v === v) ?? null;
}

// L'interruttore. Spento finche' Morelz non lo accende.
export function provaAttiva(env: Record<string, string | undefined> = process.env): boolean {
  return env.PROVA_GRATIS === "1";
}

// L'account di servizio che compra le prove: i suoi VOLT sono il budget.
export function accountProva(env: Record<string, string | undefined> = process.env): string {
  return env.PROVA_ACCOUNT || "prova@semblic.app";
}

// Quante prove al giorno in tutto (seconda rete, oltre al saldo VOLT).
export function tettoProveGiorno(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.PROVA_TETTO_GIORNO);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 200;
}

// La misura piu' economica del listino: una prova non e' una consegna.
export const MISURA_PROVA = "1024x1024";
export const QUALITA_PROVA = "medium";

// Chi puo' fare da vetrina: consenso commerciale attivo, non ritirato, con
// almeno una foto pubblica. La prima impressione non si gioca con un volto
// che esce male o con qualcuno che si e' tirato indietro.
export interface RigaVolto {
  handle: string;
  alias: string;
  revoked_at?: string | null;
  commercial_consent?: boolean | null;
  usage_count?: number | null;
  gallery_urls?: unknown;
}

export function voltiPerLaProva<T extends RigaVolto>(righe: T[], quanti = 4): T[] {
  return righe
    .filter((a) => !a.revoked_at && a.commercial_consent !== false)
    .sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
    .slice(0, quanti);
}
