import { describe, expect, it } from "vitest";
import { SAMPLE_WIDTHS, sampleWidth, sampleSrc } from "./sample-size";

describe("sampleWidth", () => {
  it("accetta solo le larghezze ammesse", () => {
    for (const w of SAMPLE_WIDTHS) expect(sampleWidth(String(w))).toBe(w);
  });

  it("qualunque altro valore vuol dire originale (null), mai una larghezza inventata", () => {
    expect(sampleWidth(null)).toBeNull();
    expect(sampleWidth("")).toBeNull();
    expect(sampleWidth("500")).toBeNull();
    expect(sampleWidth("99999")).toBeNull();
    expect(sampleWidth("720px")).toBeNull();
  });
});

describe("sampleSrc", () => {
  it("aggiunge la larghezza solo agli URL della galleria filigranata", () => {
    expect(sampleSrc("/api/sample/gabriella/0", 720)).toBe("/api/sample/gabriella/0?w=720");
  });

  it("lascia stare gli altri URL (avatar-art, data URL)", () => {
    expect(sampleSrc("data:image/svg+xml;base64,AAA", 720)).toBe("data:image/svg+xml;base64,AAA");
    expect(sampleSrc("https://example.com/a.png", 720)).toBe("https://example.com/a.png");
  });
});
