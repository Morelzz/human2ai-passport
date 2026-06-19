import { describe, it, expect, afterAll } from "vitest";
import { captureEvidence, closeBrowser, type EvidenceStorage, type EvidenceRecordRepo } from "./index";

// E2E con Playwright REALE su example.com (niente DB: storage/repo in-memory).
// Prova capturePage + l'orchestratore: screenshot PNG vero + HTML vero + hash.

const stored: Record<string, Uint8Array> = {};
const storage: EvidenceStorage = {
  async put(path, bytes) {
    stored[path] = bytes;
    return `mem/${path}`;
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inserted: any[] = [];
const repo: EvidenceRecordRepo = {
  async insert(rec) {
    inserted.push(rec);
    return "ev";
  },
};

describe("captureEvidence e2e (Playwright reale su example.com)", () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it("cattura screenshot PNG + HTML reali e inserisce il record", async () => {
    const res = await captureEvidence(
      { matchId: "e2e", sourceUrl: "https://example.com/", host: "example.com" },
      {
        storage,
        repo,
        // whois iniettato per non dipendere dalla rete RDAP nel test
        whois: async () => ({ domain: "example.com", registrar: null, created: null, expires: null, nameservers: [], status: [], source: "none" }),
      },
    );

    const png = stored["e2e/screenshot.png"];
    expect(png).toBeTruthy();
    // firma PNG: 89 50 4E 47
    expect([png[0], png[1], png[2], png[3]]).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const html = new TextDecoder().decode(stored["e2e/page.html"]);
    expect(html.toLowerCase()).toContain("example domain");

    expect(res.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(inserted).toHaveLength(1);
    console.log(`EVIDENCE e2e: png ${png.length} bytes, html ${html.length} chars, hash ${res.hash.slice(0, 12)}`);
  });
});
