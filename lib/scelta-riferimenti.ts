// SCEGLIERE LE FOTO VERE (21/9/2026). Il motore riceve le foto di riferimento e
// ne fa una media: se due o tre tirano da un'altra parte (luce, anni, trucco,
// peso diversi) il volto esce "smarmellato". Misurato su Stella: tre foto su
// otto stavano al 42-48% dalle sue stesse compagne, e una non aveva nemmeno un
// volto leggibile; il risultato ne ha risentito.
//
// Qui si scelgono le foto piu' coerenti fra loro: si scartano quelle senza
// volto e quelle troppo lontane dal gruppo, tenendone comunque almeno MINIME.
// Modulo PURO sui descrittori: chi chiama passa le impronte (lib/identity-score).

export const MINIME = 4; // mai scendere sotto: con poche foto l'identita' balla
export const MASSIME = 8;
// Oltre questa distanza dal gruppo, una foto e' un'altra persona per il misuratore.
export const TROPPO_LONTANA = 0.60;
// E comunque mai troppo peggiore della mediana del gruppo.
export const MARGINE_DALLA_MEDIANA = 0.06;

export interface Scelta {
  tenute: number[]; // indici delle foto tenute, dalla piu' coerente
  scartate: number[]; // indici scartati (senza volto o troppo lontane)
  coerenzaPrima: number | null; // distanza media fra tutte
  coerenzaDopo: number | null; // distanza media fra quelle tenute
}

function distanza(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function mediaCoppie(d: number[][]): number | null {
  if (d.length < 2) return null;
  let s = 0;
  let n = 0;
  for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) { s += distanza(d[i], d[j]); n++; }
  return s / n;
}

// desc[i] = impronta della foto i, oppure null se nella foto non c'e' un volto.
export function scegliRiferimenti(desc: (number[] | null)[]): Scelta {
  const conVolto = desc.map((d, i) => ({ i, d })).filter((x): x is { i: number; d: number[] } => Boolean(x.d));
  const senzaVolto = desc.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  if (conVolto.length <= MINIME) {
    return {
      tenute: conVolto.map((x) => x.i),
      scartate: senzaVolto,
      coerenzaPrima: mediaCoppie(conVolto.map((x) => x.d)),
      coerenzaDopo: mediaCoppie(conVolto.map((x) => x.d)),
    };
  }

  // Quanto ogni foto e' lontana dalle altre: si usa la MEDIANA, non la media,
  // perche' due intrusi alzerebbero la media di tutte e il metodo si accecherebbe.
  const mediana1 = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const lontananza = conVolto.map((x) => ({
    i: x.i,
    d: x.d,
    media: mediana1(conVolto.filter((y) => y.i !== x.i).map((y) => distanza(x.d, y.d))),
  })).sort((a, b) => a.media - b.media);

  const mediana = lontananza[Math.floor(lontananza.length / 2)].media;
  const tenute: typeof lontananza = [];
  const scartate: number[] = [...senzaVolto];
  for (const f of lontananza) {
    const dentro = f.media <= Math.min(TROPPO_LONTANA, mediana + MARGINE_DALLA_MEDIANA);
    if ((dentro && tenute.length < MASSIME) || tenute.length < MINIME) tenute.push(f);
    else scartate.push(f.i);
  }
  return {
    tenute: tenute.map((f) => f.i),
    scartate: scartate.sort((a, b) => a - b),
    coerenzaPrima: mediaCoppie(conVolto.map((x) => x.d)),
    coerenzaDopo: mediaCoppie(tenute.map((f) => f.d)),
  };
}
