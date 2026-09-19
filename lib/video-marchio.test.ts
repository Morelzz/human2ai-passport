import { describe, expect, it } from "vitest";
import { leggiMarchio, testoMarchio } from "./video-marchio";

describe("certificato dentro il video", () => {
  it("si ritrova in mezzo ai byte del file", () => {
    const cert = "ab".repeat(32);
    const bytes = new Uint8Array([0, 1, 2, 255, ...new TextEncoder().encode(testoMarchio(cert)), 0, 7]);
    expect(leggiMarchio(bytes)).toBe(cert);
  });
  it("nessun marchio o marchio rotto: null", () => {
    expect(leggiMarchio(new TextEncoder().encode("semblic-certificate:abc"))).toBeNull();
    expect(leggiMarchio(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
