import { describe, it, expect } from "vitest";
import { provenanceTag } from "./provenance";

describe("provenanceTag", () => {
  it("filigrana decodificata a un certificato = nostra", () => {
    expect(provenanceTag("a7f3d29b")).toEqual({ ours: true, certificate: "a7f3d29b" });
  });
  it("niente filigrana = non confermata (ma non e' un verdetto di estraneita')", () => {
    expect(provenanceTag(null)).toEqual({ ours: false, certificate: null });
    expect(provenanceTag("")).toEqual({ ours: false, certificate: null });
  });
  it("ripulisce spazi attorno al certificato", () => {
    expect(provenanceTag("  a7f3  ")).toEqual({ ours: true, certificate: "a7f3" });
  });
});
