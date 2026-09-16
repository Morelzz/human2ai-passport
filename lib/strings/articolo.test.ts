import { describe, expect, it } from "vitest";
import { articoloPlurale } from "./articolo";

describe("articoloPlurale", () => {
  it("gli davanti ai numeri che si leggono con vocale", () => {
    for (const n of [8, 11, 80, 88, 800, 8000, 11000, 11500]) expect(articoloPlurale(n)).toBe("gli");
  });
  it("i davanti a tutti gli altri", () => {
    for (const n of [2, 10, 12, 18, 21, 110, 111, 1100, 1800, 12000]) expect(articoloPlurale(n)).toBe("i");
  });
});
