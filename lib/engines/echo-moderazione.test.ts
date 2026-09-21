import { describe, expect, it, vi } from "vitest";
import { CLAUSOLA_SOBRIA, ErroreModerazione, generaConRipiego, livelloModerazione, promptSobrio } from "./echo";

const risultato = { png: Buffer.from("x"), model: "m", mode: "edit" as const, refsUsed: 1, size: "1024x1024" as const, quality: "high" as const };

describe("filtro del motore", () => {
  it("chiediamo il livello piu' permissivo, con leva d'emergenza", () => {
    expect(livelloModerazione()).toBe("low");
    vi.stubEnv("ECHO_MODERAZIONE", "auto");
    expect(livelloModerazione()).toBe("auto");
    vi.unstubAllEnvs();
  });

  it("al blocco si riprova una volta con la clausola sobria", async () => {
    const visti: string[] = [];
    const motore = async (i: { prompt: string }) => {
      visti.push(i.prompt);
      if (visti.length === 1) throw new ErroreModerazione("bloccata", "output");
      return risultato;
    };
    await generaConRipiego({ prompt: "due ragazze che posano" }, motore as never);
    expect(visti).toHaveLength(2);
    expect(visti[1]).toBe("due ragazze che posano" + CLAUSOLA_SOBRIA);
  });

  it("se anche il secondo tentativo viene fermato, l'errore arriva al cliente", async () => {
    const motore = async () => { throw new ErroreModerazione("bloccata", "output"); };
    await expect(generaConRipiego({ prompt: promptSobrio("x") }, motore as never)).rejects.toThrow("bloccata");
  });

  it("gli altri errori non fanno ritentare", async () => {
    let n = 0;
    const motore = async () => { n++; throw new Error("rete"); };
    await expect(generaConRipiego({ prompt: "x" }, motore as never)).rejects.toThrow("rete");
    expect(n).toBe(1);
  });
});
