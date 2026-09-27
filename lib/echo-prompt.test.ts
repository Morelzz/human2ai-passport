import { describe, expect, it } from "vitest";
import { buildEchoPrompt } from "./echo-prompt";

describe("prompt dello scatto singolo", () => {
  it("l'unico volto riconoscibile e' quello con il consenso", () => {
    const p = buildEchoPrompt("canta su un palco davanti al pubblico", [], null, "The person is an Italian woman.", null);
    expect(p).toContain("only recognizable face");
    expect(p).toContain("out of focus and not recognizable");
    expect(p.indexOf("only recognizable face")).toBeLessThan(p.indexOf("Additional direction"));
    expect(p).toContain("The person is an Italian woman.");
  });

  it("le foto dicono chi e', non la luce ne' i vestiti", () => {
    const p = buildEchoPrompt("luce dura da destra", [], null, null, null);
    expect(p).toContain("Do NOT copy their lighting");
    expect(p).toContain("clothing");
    expect(p.indexOf("Do NOT copy")).toBeLessThan(p.indexOf("Additional direction"));
  });

  it("una scena lunga arriva intera fino alla fine (i vestiti stanno in fondo)", () => {
    const scena = "luce dura da destra, ".repeat(40) + "Person 2 wears an oversized white linen shirt";
    expect(scena.length).toBeGreaterThan(600);
    expect(buildEchoPrompt(scena, [], null, null, null)).toContain("white linen shirt");
  });

  it("nella serie il primo scatto guida vestiti, luce e colore degli altri", () => {
    const p = buildEchoPrompt("al mercato, sceglie la frutta", [{ role: "serie", desc: "" }], null, null, null);
    expect(p).toContain("same photo shoot");
    expect(p).toContain("same outfit");
    expect(p.indexOf("same photo shoot")).toBeLessThan(p.indexOf("Additional direction"));
  });
});
