import { describe, expect, it } from "vitest";
import { interpretaRisposta, nomiNellaScena, scegliConFissi, scegliVolti, type Candidato } from "./casting";

const av = (handle: string, x: Partial<Candidato>): Candidato => ({
  handle, alias: handle, gender: "donna", ethnicity: "caucasico", hair_color: "castani", age_range: "18-25",
  eye_color: "marroni", height: "media", body_type: "slim", commercial_consent: true, usage_count: 0, ...x,
});
const registro: Candidato[] = [
  av("greta", { hair_color: "biondi", usage_count: 5 }),
  av("veronica", { hair_color: "biondi", usage_count: 0 }),
  av("stella", {}),
  av("luca", { gender: "uomo", hair_color: "biondi", age_range: "45-55" }),
  av("nascosta", { hair_color: "biondi", commercial_consent: false }),
];
const persona = (x: Record<string, unknown>) => ({ ruolo: "protagonista", gender: null, ethnicity: null, hair_color: null, age_min: null, age_max: null, eye_color: null, height: null, body_type: null, ...x }) as never;

describe("casting automatico", () => {
  it("legge la risposta del modello e taglia a 4 protagonisti", () => {
    const l = interpretaRisposta('```json\n{"persone":[{"ruolo":"a","gender":"donna"},{"ruolo":"b"},{"ruolo":"c"},{"ruolo":"d"},{"ruolo":"e"}],"folla":true}\n```');
    expect(l.persone).toHaveLength(4);
    expect(l.persone[0].gender).toBe("donna");
    expect(l.folla).toBe(true);
  });

  it("sceglie la bionda usata meno, mai chi non ha il consenso", () => {
    const [s] = scegliVolti({ persone: [persona({ gender: "donna", hair_color: "biondi" })], folla: false }, registro);
    expect(s.handle).toBe("veronica");
    expect(s.corrispondenza).toBe("esatto");
    expect(s.alternative).toContain("greta");
    expect(s.alternative).not.toContain("nascosta");
  });

  it("due protagonisti non prendono mai lo stesso volto", () => {
    const l = { persone: [persona({ gender: "donna", hair_color: "biondi" }), persona({ gender: "donna", hair_color: "biondi" })], folla: false };
    const [a, b] = scegliVolti(l, registro);
    expect(a.handle).not.toBe(b.handle);
  });

  it("senza nessuno esatto propone il piu' vicino e dice cosa cambia, mai il genere", () => {
    const [s] = scegliVolti({ persone: [persona({ gender: "donna", hair_color: "rossi" })], folla: false }, registro);
    expect(s.corrispondenza).toBe("vicino");
    expect(s.differenze).toContain("capelli");
    const [u] = scegliVolti({ persone: [persona({ gender: "uomo", age_min: 70, age_max: 80, hair_color: "grigi" })], folla: false }, registro);
    expect(u.handle).toBe("luca");
    expect(u.differenze).toEqual(expect.arrayContaining(["età", "capelli"]));
    const [n] = scegliVolti({ persone: [persona({ gender: "uomo" })], folla: false }, registro.filter((c) => c.gender === "donna"));
    expect(n.handle).toBeNull();
  });

  it("i nomi del registro nella frase, con la maiuscola e nell'ordine in cui compaiono", () => {
    const reg = [...registro, av("gabriella", { alias: "Gabriella" }), av("stellina", { alias: "Stella" }), av("luca-a", { alias: "Luca Agnelli", gender: "uomo" })];
    expect(nomiNellaScena("Stella e Gabriella brindano al bar", reg).map((c) => c.handle)).toEqual(["stellina", "gabriella"]);
    // "stella" minuscola e' una parola comune: non e' una persona
    expect(nomiNellaScena("sotto una stella cadente", reg)).toEqual([]);
    // basta il nome, e gli accenti non contano
    expect(nomiNellaScena("Luca guida al tramonto", reg).map((c) => c.handle)).toEqual(["luca-a"]);
    expect(nomiNellaScena("Gabriellaaa al mare", reg)).toEqual([]);
  });

  it("il volto gia' scelto resta il primo, il casting riempie solo gli altri ruoli", () => {
    const lettura = { persone: [persona({ ruolo: "amica bionda", gender: "donna", hair_color: "biondi" }), persona({ ruolo: "amica mora", gender: "donna" })], folla: false };
    const stella = registro.find((c) => c.handle === "stella")!;
    const s = scegliConFissi(lettura, registro, [stella]);
    expect(s[0].handle).toBe("stella");
    expect(s[0].ruolo).toBe("amica mora"); // prende il ruolo che le somiglia (castani, non bionda)
    expect(s[1].handle).toBe("veronica"); // la bionda usata meno
    expect(s).toHaveLength(2);
  });

  it("persone chieste per nome ma non lette come ruoli: si aggiungono", () => {
    const stella = registro.find((c) => c.handle === "stella")!;
    const greta = registro.find((c) => c.handle === "greta")!;
    const s = scegliConFissi({ persone: [persona({ ruolo: "ragazza al bar", gender: "donna" })], folla: false }, registro, [stella, greta]);
    expect(s.map((x) => x.handle)).toEqual(["stella", "greta"]);
    expect(s.every((x) => x.corrispondenza === "esatto")).toBe(true);
  });

  it("il volto scelto prende il ruolo del soggetto anche se la lettura ha indovinato altri dettagli", () => {
    // "brinda con un'amica bionda": due ruoli; il soggetto letto come 30-40 anni con occhi verdi
    const lettura = { persone: [persona({ ruolo: "donna che brinda", gender: "donna", age_min: 30, age_max: 40, eye_color: "verdi" }), persona({ ruolo: "amica bionda", gender: "donna", hair_color: "biondi" })], folla: false };
    const stella = registro.find((c) => c.handle === "stella")!;
    const s = scegliConFissi(lettura, registro, [stella]);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ handle: "stella", ruolo: "donna che brinda" });
    expect(s[1].handle).toBe("veronica");
  });

  it("un uomo nella scena e una donna scelta: nessun gruppo a sorpresa, resta lei", () => {
    const stella = registro.find((c) => c.handle === "stella")!;
    const s = scegliConFissi({ persone: [persona({ ruolo: "uomo anziano", gender: "uomo", age_min: 60 })], folla: false }, registro, [stella]);
    expect(s.map((x) => x.handle)).toEqual(["stella"]);
  });
});
