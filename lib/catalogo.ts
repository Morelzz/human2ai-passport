// ──────────────────────────────────────────────────────────────────────────
// IL CATALOGO CHE PARLA (22/9/2026). Fino a ieri ogni tessera del registro
// diceva due cose: "Verificata" e il nome. Chi arriva per comprare non sapeva
// se quella persona ha detto si' anche al video, quante volte l'hanno scelta,
// se e' ancora disponibile o quanto costa: dati che avevamo gia' tutti nel
// database, e che tenevamo per noi.
//
// Modulo PURO: prende le righe del registro e ne ricava quello che si vede
// sulla tessera e i filtri con i numeri veri. Niente rete, niente face-api:
// cosi' si prova senza database.
// ──────────────────────────────────────────────────────────────────────────

export interface RigaCatalogo {
  handle: string;
  alias: string;
  gender?: string | null;
  revoked_at?: string | null;
  commercial_consent?: boolean | null;
  video_consent?: boolean | null;
  usage_count?: number | null;
}

export interface VoltoCatalogo {
  handle: string;
  alias: string;
  gender: string | null;
  revocato: boolean;
  foto: boolean; // si' all'uso commerciale
  video: boolean; // si' al video (Anima)
  utilizzi: number;
}

// Il consenso commerciale e' un default-si' storico: solo un false esplicito lo toglie.
export function voltoCatalogo(a: RigaCatalogo): VoltoCatalogo {
  const revocato = Boolean(a.revoked_at);
  return {
    handle: a.handle,
    alias: a.alias,
    gender: a.gender ?? null,
    revocato,
    foto: !revocato && a.commercial_consent !== false,
    video: !revocato && a.video_consent === true,
    utilizzi: a.usage_count ?? 0,
  };
}

export type ChiaveFiltro = "tutti" | "donne" | "uomini" | "video" | "liberi" | "mai";

export const FILTRI: { v: ChiaveFiltro; l: string }[] = [
  { v: "tutti", l: "Tutti" },
  { v: "donne", l: "Donne" },
  { v: "uomini", l: "Uomini" },
  { v: "video", l: "Dicono sì al video" },
  { v: "liberi", l: "Liberi adesso" },
  { v: "mai", l: "Mai usati" },
];

export function passaIlFiltro(v: VoltoCatalogo, f: ChiaveFiltro): boolean {
  switch (f) {
    case "donne":
      return v.gender?.toLowerCase() === "donna";
    case "uomini":
      return v.gender?.toLowerCase() === "uomo";
    case "video":
      return v.video;
    case "liberi":
      return v.foto;
    case "mai":
      return v.utilizzi === 0;
    default:
      return true;
  }
}

// I numeri dentro i filtri: quelli veri, non stime. Un filtro che conta zero
// non si mostra (tranne "Tutti"): un bottone che non porta da nessuna parte
// e' rumore.
export function conteggi(volti: VoltoCatalogo[]): Record<ChiaveFiltro, number> {
  const out = {} as Record<ChiaveFiltro, number>;
  for (const f of FILTRI) out[f.v] = volti.filter((v) => passaIlFiltro(v, f.v)).length;
  return out;
}

// Cosa dice la tessera, in ordine. Chi si e' ritirato non ha bollini di
// disponibilita': una riga sola, e dice la verita'.
export function bollini(v: VoltoCatalogo): { testo: string; tono: "si" | "no" | "uso" | "neutro" }[] {
  if (v.revocato) return [{ testo: "HA CHIESTO DI USCIRE", tono: "no" }];
  const out: { testo: string; tono: "si" | "no" | "uso" | "neutro" }[] = [
    { testo: v.foto ? "FOTO SÌ" : "FOTO NO", tono: v.foto ? "si" : "no" },
    { testo: v.video ? "VIDEO SÌ" : "VIDEO NO", tono: v.video ? "si" : "no" },
  ];
  out.push(
    v.utilizzi === 0
      ? { testo: "MAI USATO", tono: "neutro" }
      : { testo: `USATO ${v.utilizzi}×`, tono: "uso" },
  );
  return out;
}
