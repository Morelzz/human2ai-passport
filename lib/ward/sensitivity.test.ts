import { describe, it, expect } from "vitest";
import { classifySensitivity } from "./sensitivity";

describe("classifySensitivity", () => {
  it("host adult noti: sensitive (anche con www e sottodomini)", () => {
    expect(classifySensitivity("pornhub.com")).toBe("sensitive");
    expect(classifySensitivity("www.onlyfans.com")).toBe("sensitive");
    expect(classifySensitivity("it.xhamster.com")).toBe("sensitive");
  });

  it("TLD adult: sensitive", () => {
    expect(classifySensitivity("qualcosa.xxx")).toBe("sensitive");
    expect(classifySensitivity("brand.adult")).toBe("sensitive");
  });

  it("substring 'porn': sensitive anche su domini composti", () => {
    expect(classifySensitivity("bestpornsite.net")).toBe("sensitive");
    expect(classifySensitivity("freeporn.example.org")).toBe("sensitive");
  });

  it("parole ambigue solo come SEGMENTO esatto (niente falsi positivi)", () => {
    expect(classifySensitivity("sex.example.com")).toBe("sensitive"); // segmento esatto
    expect(classifySensitivity("escort-milano.it")).toBe("sensitive"); // separato da -
    expect(classifySensitivity("essex.gov.uk")).toBe("standard");      // NON 'sex'
    expect(classifySensitivity("middlesex.edu")).toBe("standard");     // NON 'sex'
    expect(classifySensitivity("sussex.ac.uk")).toBe("standard");
  });

  it("siti normali: standard", () => {
    expect(classifySensitivity("instagram.com")).toBe("standard");
    expect(classifySensitivity("en.wikipedia.org")).toBe("standard");
    expect(classifySensitivity("youtube.com")).toBe("standard");
  });

  it("host vuoto o assente: standard (fail-safe)", () => {
    expect(classifySensitivity("")).toBe("standard");
    expect(classifySensitivity(null)).toBe("standard");
    expect(classifySensitivity(undefined)).toBe("standard");
  });
});
