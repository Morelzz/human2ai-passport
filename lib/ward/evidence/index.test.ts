import { describe, it, expect } from "vitest";
import { captureEvidence, type EvidenceStorage, type EvidenceRecordRepo } from "./index";
import type { WhoisSummary } from "./whois";

function fakes() {
  const puts: { path: string; type: string; size: number }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inserted: any[] = [];
  const storage: EvidenceStorage = {
    async put(path, bytes, contentType) {
      puts.push({ path, type: contentType, size: bytes.length });
      return `ward-evidence/${path}`;
    },
  };
  const repo: EvidenceRecordRepo = {
    async insert(rec) {
      inserted.push(rec);
      return "ev-1";
    },
  };
  return { storage, repo, puts, inserted };
}

const who: WhoisSummary = {
  domain: "unknown-host.ru",
  registrar: "Ned-Host LLC",
  created: null,
  expires: null,
  nameservers: [],
  status: [],
  source: "rdap",
};

describe("captureEvidence", () => {
  it("cattura la pagina, carica screenshot+html, allega whois e hash, inserisce il record", async () => {
    const f = fakes();
    const capture = async (url: string) => ({ screenshot: new Uint8Array([1, 2, 3]), html: `<html>${url}</html>` });
    const res = await captureEvidence(
      { matchId: "m1", sourceUrl: "https://cdn.unknown-host.ru/x.jpg", pageUrl: "https://unknown-host.ru/p", host: "cdn.unknown-host.ru" },
      { storage: f.storage, repo: f.repo, capture, whois: async () => who },
    );
    expect(f.puts.map((p) => p.path)).toEqual(["m1/screenshot.png", "m1/page.html"]);
    expect(f.puts[0].type).toBe("image/png");
    expect(f.puts[1].type).toBe("text/html");
    expect(res.screenshotPath).toBe("ward-evidence/m1/screenshot.png");
    expect(res.htmlPath).toBe("ward-evidence/m1/page.html");
    expect(res.whois).toEqual(who);
    expect(res.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(f.inserted).toHaveLength(1);
    expect(f.inserted[0]).toMatchObject({
      scanMatchId: "m1",
      screenshotPath: res.screenshotPath,
      htmlPath: res.htmlPath,
      hash: res.hash,
    });
    expect(f.inserted[0].whois).toEqual(who);
  });

  it("cattura l'immagine se non c'e' pageUrl", async () => {
    const f = fakes();
    let captured = "";
    const capture = async (url: string) => {
      captured = url;
      return { screenshot: new Uint8Array([9]), html: "x" };
    };
    await captureEvidence(
      { matchId: "m2", sourceUrl: "https://cdn.host/x.jpg", host: "cdn.host" },
      { storage: f.storage, repo: f.repo, capture, whois: async () => who },
    );
    expect(captured).toBe("https://cdn.host/x.jpg");
  });

  it("hash sha256 dello screenshot: deterministico, 64 hex", async () => {
    const f = fakes();
    const capture = async () => ({ screenshot: new Uint8Array([1, 2, 3, 4]), html: "x" });
    const r1 = await captureEvidence({ matchId: "a", sourceUrl: "u", host: "h" }, { storage: f.storage, repo: f.repo, capture, whois: async () => who });
    const r2 = await captureEvidence({ matchId: "b", sourceUrl: "u", host: "h" }, { storage: f.storage, repo: f.repo, capture, whois: async () => who });
    expect(r1.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(r1.hash).toBe(r2.hash);
  });
});
