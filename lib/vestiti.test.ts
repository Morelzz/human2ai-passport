import { describe, expect, it } from "vitest";
import { scenaConVestiti, vestitiDa, MAX_VESTITI } from "./vestiti";

describe("i vestiti di ognuno", () => {
  it("nel gruppo ogni capo dice a chi appartiene, prima della scena", () => {
    const s = scenaConVestiti("in un capannone buio", ["giubbotto di pelle nera", "camicia di lino bianca"], true);
    expect(s).toBe("Person 1 (first from the left) wears giubbotto di pelle nera. Person 2 (second from the left) wears camicia di lino bianca. in un capannone buio");
  });

  it("nello scatto singolo una frase sola", () => {
    expect(scenaConVestiti("al mare", ["un costume rosso"], false)).toBe("The person wears un costume rosso. al mare");
  });

  it("chi non ha vestiti scritti non compare, e senza vestiti la scena resta uguale", () => {
    expect(scenaConVestiti("al bar", ["", "felpa grigia"], true)).toBe("Person 2 (second from the left) wears felpa grigia. al bar");
    expect(scenaConVestiti("al bar", [], true)).toBe("al bar");
  });

  it("pulisce, taglia e non va oltre il numero di persone", () => {
    const v = vestitiDa(["  maglia\n blu. ", "x".repeat(400), "terzo"], 2);
    expect(v).toEqual(["maglia blu", "x".repeat(MAX_VESTITI)]);
    expect(vestitiDa("giacca", 1)).toEqual(["giacca"]);
    expect(vestitiDa(42, 1)).toEqual([]);
  });
});
