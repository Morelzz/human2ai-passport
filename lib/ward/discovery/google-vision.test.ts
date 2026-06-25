import { describe, it, expect } from "vitest";
import { parseWebDetection } from "./google-vision";

// parseWebDetection e' PURA: dal webDetection di Vision costruisce i candidati.
// Sorgenti: fullMatchingImages + partialMatchingImages + visuallySimilarImages
// (queste ultime per i lookalike AI). La pagina ospitante si ricava da
// pagesWithMatchingImages (mappa immagine -> url pagina).
describe("parseWebDetection", () => {
  it("prende full + partial + visuallySimilar images", () => {
    const web = {
      fullMatchingImages: [{ url: "https://a.com/1.jpg" }],
      partialMatchingImages: [{ url: "https://b.com/2.jpg" }],
      visuallySimilarImages: [{ url: "https://c.com/3.jpg" }],
    };
    const out = parseWebDetection(web, 10);
    expect(out.map((c) => c.url)).toEqual([
      "https://a.com/1.jpg",
      "https://b.com/2.jpg",
      "https://c.com/3.jpg",
    ]);
    expect(out[0].host).toBe("a.com");
  });

  it("mappa la pagina ospitante da pagesWithMatchingImages", () => {
    const web = {
      fullMatchingImages: [{ url: "https://cdn.x.com/img.jpg" }],
      pagesWithMatchingImages: [
        { url: "https://x.com/post/123", fullMatchingImages: [{ url: "https://cdn.x.com/img.jpg" }] },
      ],
    };
    const out = parseWebDetection(web, 10);
    expect(out).toHaveLength(1);
    expect(out[0].pageUrl).toBe("https://x.com/post/123");
  });

  it("un visuallySimilar senza pagina ha pageUrl undefined", () => {
    const web = { visuallySimilarImages: [{ url: "https://ai.net/face.png" }] };
    const out = parseWebDetection(web, 10);
    expect(out[0].pageUrl).toBeUndefined();
  });

  it("deduplica per url tra le categorie", () => {
    const web = {
      fullMatchingImages: [{ url: "https://a.com/1.jpg" }],
      visuallySimilarImages: [{ url: "https://a.com/1.jpg" }, { url: "https://a.com/2.jpg" }],
    };
    const out = parseWebDetection(web, 10);
    expect(out.map((c) => c.url)).toEqual(["https://a.com/1.jpg", "https://a.com/2.jpg"]);
  });

  it("rispetta il limite", () => {
    const web = {
      visuallySimilarImages: Array.from({ length: 20 }, (_, i) => ({ url: `https://a.com/${i}.jpg` })),
    };
    expect(parseWebDetection(web, 5)).toHaveLength(5);
  });

  it("ignora ref senza url e webDetection vuoto", () => {
    expect(parseWebDetection({}, 10)).toEqual([]);
    expect(parseWebDetection({ fullMatchingImages: [{}, { url: "" }] }, 10)).toEqual([]);
  });
});
