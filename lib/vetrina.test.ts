import { describe, it, expect } from "vitest";
import { vetrinaDa } from "./vetrina";

const gen = { certificate: "d20b966b1352abc", gross_cents: 50, royalty_cents: 11 };
const av = { handle: "gabriella", alias: "Gabriella", revoked_at: null, commercial_consent: true, verification_status: "approved", protection_only: false };
const job = { echoSize: "1536x1024", echoQuality: "high" };

describe("vetrinaDa", () => {
  it("mostra i numeri veri dello scatto", () => {
    expect(vetrinaDa(gen, av, job)).toEqual({
      certificato: "d20b966b1352abc", handle: "gabriella", nome: "Gabriella",
      prezzoCent: 50, allaPersonaCent: 11, formato: "orizzontale", qualita: "alta", consensoDal: null,
    });
  });

  it("porta il giorno del si' senza l'ora", () => {
    expect(vetrinaDa(gen, { ...av, consent_start: "2026-06-10T00:00:00+00:00" }, job)?.consensoDal).toBe("2026-06-10");
  });

  it("con il consenso revocato la persona esce dalla vetrina", () => {
    expect(vetrinaDa(gen, { ...av, revoked_at: "2026-10-01" }, job)).toBeNull();
    expect(vetrinaDa(gen, { ...av, commercial_consent: false }, job)).toBeNull();
    expect(vetrinaDa(gen, { ...av, protection_only: true }, job)).toBeNull();
  });

  it("senza numeri non si inventa niente", () => {
    expect(vetrinaDa({ ...gen, royalty_cents: null }, av, job)).toBeNull();
    expect(vetrinaDa(null, av, job)).toBeNull();
  });

  it("formato e qualita' dal lavoro vero", () => {
    expect(vetrinaDa(gen, av, { echoSize: "1024x1536", echoQuality: "medium" })).toMatchObject({ formato: "verticale", qualita: "bozza" });
    expect(vetrinaDa(gen, av, { echoSize: "3840x2160", echoQuality: "high" })).toMatchObject({ formato: "orizzontale", qualita: "stampa" });
  });
});
