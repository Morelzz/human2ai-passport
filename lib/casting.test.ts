import { describe, expect, it } from "vitest";
import { interpretaRisposta, scegliVolti, type Candidato } from "./casting";

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
});
