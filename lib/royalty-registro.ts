// ──────────────────────────────────────────────────────────────────────────
// QUANTO SI DEVE DAVVERO A UNA PERSONA (23/9/2026).
//
// avatars.royalty_accrued_cents e' un contatore comodo, ma e' solo un numero:
// fino al lock SQL del 23/9 il proprietario del volto lo poteva riscrivere da
// solo col suo accesso al database (provato: 0 -> 999.999 centesimi). Un
// pagamento non si fa su un numero che qualcuno puo' aver scritto. Si fa sul
// REGISTRO: la somma delle quote scritte su ogni scatto e ogni video, meno
// quello che e' gia' stato pagato.
//
// Controllato sui dati veri il 23/9: per ogni persona reale del registro il
// contatore e il registro coincidono al centesimo. Si paga il MINORE dei due:
// se il contatore e' gonfiato non esce un euro in piu', se e' indietro non si
// paga niente che non sia dovuto e si guarda perche'.
//
// Parte pura (conti) e parte che legge il database, separate: i conti si
// provano senza rete.
// ──────────────────────────────────────────────────────────────────────────

import { dividiRoyalty } from "@/lib/gruppo-prezzi";

export interface RigheRegistro {
  // scatti singoli di QUESTO volto (non di gruppo)
  singoli: { royalty_cents: number | null }[];
  // le sue righe nelle scene di gruppo
  gruppo: { royalty_cents: number | null }[];
  // i video pronti: per quelli di gruppo, la sua posizione e quante persone c'erano
  video: { royalty_cents: number | null; posizione: number; persone: number }[];
  // quello che gli e' gia' stato pagato
  pagati: { amount_cents: number | null }[];
}

/** Le quote maturate secondo il registro, prima dei pagamenti. */
export function maturatoDalRegistro(r: RigheRegistro): number {
  const somma = (xs: { royalty_cents: number | null }[]) => xs.reduce((s, x) => s + (x.royalty_cents ?? 0), 0);
  // Un video di gruppo porta la royalty TOTALE sulla sua riga: alla persona
  // spetta la sua parte, divisa come l'ha divisa il worker (lib/anima-job).
  const video = r.video.reduce((s, v) => {
    const tot = v.royalty_cents ?? 0;
    if (v.persone <= 1) return s + tot;
    return s + (dividiRoyalty(tot, v.persone)[v.posizione] ?? 0);
  }, 0);
  return somma(r.singoli) + somma(r.gruppo) + video;
}

export function pagatoDalRegistro(r: RigheRegistro): number {
  return r.pagati.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
}

/**
 * Quanto si puo' pagare adesso: il minore fra il contatore e quello che il
 * registro giustifica. `sospetto` = il contatore dice PIU' del registro, cioe'
 * qualcuno o qualcosa l'ha gonfiato: si paga il giusto e si segnala.
 */
export function pagabile(contatore: number, r: RigheRegistro): { importo: number; dovuto: number; sospetto: boolean } {
  const dovuto = Math.max(0, maturatoDalRegistro(r) - pagatoDalRegistro(r));
  const c = Math.max(0, Number.isFinite(contatore) ? contatore : 0);
  return { importo: Math.min(c, dovuto), dovuto, sospetto: c > dovuto };
}

// ── Lettura dal database (SERVER-ONLY) ─────────────────────────────────────

type Admin = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function registroDelVolto(admin: Admin, avatarId: string): Promise<RigheRegistro> {
  const [{ data: gens }, { data: gp }, { data: po }] = await Promise.all([
    admin.from("generations").select("id, royalty_cents").eq("avatar_id", avatarId),
    admin.from("generation_people").select("generation_id, avatar_id, posizione, royalty_cents").eq("avatar_id", avatarId),
    admin.from("payouts").select("amount_cents").eq("avatar_id", avatarId),
  ]);
  // Solo i video nati da scatti in cui c'e' questo volto.
  const idRilevanti = [...new Set([
    ...(gens ?? []).map((g: { id: string }) => g.id),
    ...(gp ?? []).map((r: { generation_id: string }) => r.generation_id),
  ])];
  const { data: an } = idRilevanti.length
    ? await admin.from("animations").select("royalty_cents, status, source_generation_id").eq("status", "done").in("source_generation_id", idRilevanti)
    : { data: [] };

  // Quali generazioni sono di gruppo (si contano gia' in generation_people).
  const idGen = (gens ?? []).map((g: { id: string }) => g.id);
  const { data: diGruppo } = idGen.length
    ? await admin.from("generation_people").select("generation_id").in("generation_id", idGen)
    : { data: [] as { generation_id: string }[] };
  const gruppi = new Set((diGruppo ?? []).map((r: { generation_id: string }) => r.generation_id));

  // I video in cui c'e' questo volto: quelli nati da un suo scatto singolo,
  // o da una scena di gruppo in cui compare (con la sua posizione).
  const sorgenti = (an ?? []) as { royalty_cents: number | null; source_generation_id: string }[];
  const miaPosizione = new Map<string, number>((gp ?? []).map((r: { generation_id: string; posizione: number }) => [r.generation_id, r.posizione]));
  const persone = new Map<string, number>();
  const idSorgentiGruppo = sorgenti.map((s) => s.source_generation_id).filter((id) => miaPosizione.has(id));
  if (idSorgentiGruppo.length) {
    const { data: tutte } = await admin.from("generation_people").select("generation_id").in("generation_id", idSorgentiGruppo);
    for (const r of tutte ?? []) persone.set(r.generation_id, (persone.get(r.generation_id) ?? 0) + 1);
  }
  const mieiSingoli = new Set(idGen.filter((id: string) => !gruppi.has(id)));
  const video = sorgenti.flatMap((s) => {
    if (mieiSingoli.has(s.source_generation_id)) return [{ royalty_cents: s.royalty_cents, posizione: 0, persone: 1 }];
    if (miaPosizione.has(s.source_generation_id)) {
      return [{ royalty_cents: s.royalty_cents, posizione: miaPosizione.get(s.source_generation_id)!, persone: persone.get(s.source_generation_id) ?? 1 }];
    }
    return [];
  });

  return {
    singoli: (gens ?? []).filter((g: { id: string }) => !gruppi.has(g.id)),
    gruppo: gp ?? [],
    video,
    pagati: po ?? [],
  };
}
