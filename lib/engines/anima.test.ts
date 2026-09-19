import { describe, expect, it } from "vitest";
import { corpoPer, costoSeedanceUsd, isMotoreVideo } from "./anima";

describe("anima", () => {
  it("Seedance 2.5: formula a token come da /estimate", () => {
    // 480p (854x480) = 0,2056 $ al secondo: il prezzo di listino della loro pagina.
    expect(costoSeedanceUsd(1, 854, 480)).toBeCloseTo(0.206, 2);
    // 720p verticale, 5 secondi
    expect(costoSeedanceUsd(5)).toBeCloseTo(2.311, 2);
  });

  it("l'audio resta sempre spento su Seedance", () => {
    const c = corpoPer("cinema", { immagine: "https://x/y.png", movimento: "respira e guarda in camera", secondi: 5 });
    expect(c.generate_audio).toBe(false);
    expect(c.resolution).toBe("720p");
  });

  it("durata fuori lista torna alla prima ammessa", () => {
    expect(corpoPer("veloce", { immagine: "https://x/y.png", movimento: "m", secondi: 27 }).duration).toBe(5);
    expect(corpoPer("veloce", { immagine: "https://x/y.png", movimento: "m", secondi: 10 }).duration).toBe(10);
  });

  it("riconosce solo i motori previsti", () => {
    expect(isMotoreVideo("veloce")).toBe(true);
    expect(isMotoreVideo("sora")).toBe(false);
  });
});
