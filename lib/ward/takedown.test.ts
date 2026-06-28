import { describe, it, expect } from "vitest";
import { buildDmcaNotice, nextTakedownStatus, classifyRecheck } from "./takedown";

const base = {
  claimant: { fullName: "Mario Rossi", address: "Via Roma 1, Milano", email: "m@x.it" },
  copy: { pageUrl: "https://bad.ru/p", sourceUrl: "https://bad.ru/i.jpg", host: "bad.ru" },
  work: { alias: "Ritratto A", certificate: "cert-1", verifyUrl: "https://semblic.com/v/cert-1", phash: "abcd", generatedAt: "2026-06-01" },
  abuse: { domain: "bad.ru", registrar: "RegX", source: "rdap" as const },
};

describe("buildDmcaNotice", () => {
  it("compone la notice coi dati e gli statement obbligatori", () => {
    const n = buildDmcaNotice(base);
    expect(n.infringingUrl).toBe("https://bad.ru/p");
    expect(n.claimant.fullName).toBe("Mario Rossi");
    expect(n.body).toContain("https://bad.ru/p");
    expect(n.body).toContain("https://semblic.com/v/cert-1");
    expect(n.body).toContain("Mario Rossi");
    expect(n.body.toLowerCase()).toContain("good faith");
    expect(n.body.toLowerCase()).toContain("perjury");
  });
  it("usa sourceUrl come infringingUrl se manca pageUrl", () => {
    const n = buildDmcaNotice({ ...base, copy: { ...base.copy, pageUrl: null } });
    expect(n.infringingUrl).toBe("https://bad.ru/i.jpg");
  });
  it("abuse contact assente non rompe la notice", () => {
    const n = buildDmcaNotice({ ...base, abuse: null });
    expect(n.to).toContain("non disponibile");
    expect(n.body).toContain("Mario Rossi");
  });
});

describe("nextTakedownStatus", () => {
  it("drafted+send -> sent", () => expect(nextTakedownStatus("drafted", "send")).toBe("sent"));
  it("sent+recheck-gone -> removed", () => expect(nextTakedownStatus("sent", "recheck-gone")).toBe("removed"));
  it("sent+recheck-online -> online", () => expect(nextTakedownStatus("sent", "recheck-online")).toBe("online"));
  it("online+recheck-gone -> removed", () => expect(nextTakedownStatus("online", "recheck-gone")).toBe("removed"));
  it("transizione invalida lancia", () => expect(() => nextTakedownStatus("drafted", "recheck-gone")).toThrow());
});

describe("classifyRecheck", () => {
  it("404/410/null = gone", () => {
    expect(classifyRecheck(404)).toBe("gone");
    expect(classifyRecheck(410)).toBe("gone");
    expect(classifyRecheck(null)).toBe("gone");
  });
  it("200 = online", () => expect(classifyRecheck(200)).toBe("online"));
  it("status incerto = online (prudente)", () => expect(classifyRecheck(500)).toBe("online"));
});
