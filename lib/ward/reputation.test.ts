import { describe, it, expect } from "vitest";
import { domainReputation, KNOWN_PLATFORMS } from "./reputation";

describe("domainReputation", () => {
  it("le piattaforme note e i loro sottodomini sono 'exposed'", () => {
    expect(domainReputation("instagram.com")).toBe("exposed");
    expect(domainReputation("www.instagram.com")).toBe("exposed");
    expect(domainReputation("m.facebook.com")).toBe("exposed");
    expect(domainReputation("x.com")).toBe("exposed");
  });
  it("tutto il resto e' 'obscure' (default prudente)", () => {
    expect(domainReputation("dark-forum.ru")).toBe("obscure");
    expect(domainReputation("random-site.xyz")).toBe("obscure");
  });
  it("host nullo o vuoto = 'obscure'", () => {
    expect(domainReputation(null)).toBe("obscure");
    expect(domainReputation("")).toBe("obscure");
  });
  it("non si fa ingannare dal nome piattaforma come sottostringa", () => {
    expect(domainReputation("instagram.com.evil.ru")).toBe("obscure");
    expect(domainReputation("notinstagram.com")).toBe("obscure");
  });
  it("KNOWN_PLATFORMS e' non vuoto e tutto lowercase", () => {
    expect(KNOWN_PLATFORMS.length).toBeGreaterThan(10);
    expect(KNOWN_PLATFORMS.every((d) => d === d.toLowerCase())).toBe(true);
  });
});
