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
});
