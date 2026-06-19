import { describe, it, expect } from "vitest";
import { dhash } from "./phash";

describe("dhash (difference hash, puro)", () => {
  it("confronto orizzontale dei pixel adiacenti (caso 3x2)", () => {
    // row0: 10,20,5 -> 10>20?0, 20>5?1 ; row1: 30,30,40 -> 0,0  => 0100 = 0x4
    expect(dhash([10, 20, 5, 30, 30, 40], 3, 2)).toBe("4");
  });
  it("immagine piatta (pixel uguali) -> tutti zero", () => {
    expect(dhash([7, 7, 7, 7, 7, 7], 3, 2)).toBe("0");
  });
  it("gradiente decrescente -> bit a 1", () => {
    // 3x1: 50,40,30 -> 50>40?1, 40>30?1 => 1100 = 0xc
    expect(dhash([50, 40, 30], 3, 1)).toBe("c");
  });
  it("64 bit -> 16 hex (dimensione reale 9x8)", () => {
    expect(dhash(new Array(9 * 8).fill(0), 9, 8)).toHaveLength(16);
  });
});
