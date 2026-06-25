import { describe, it, expect } from "vitest";
import { buildWardData, type WardLoadInput } from "./load";

const base: WardLoadInput = {
  avatar: { id: "ee6a2c68-ab3a-4771-b2cb-6f8470011c9c", handle: "greta" },
  consentStatus: "active",
  jobs: [
    { finished_at: "2026-06-19T10:00:00Z", stats: { discarded: 200 } },
    { finished_at: "2026-06-19T09:00:00Z", stats: { discarded: 9 } },
  ],
  matches: [
    { id: "m1", source_url: "https://cdn.unknown-host.ru/a.jpg", page_url: "https://unknown-host.ru/post/1", host: "unknown-host.ru", score: 94, band: "confirmed", sensitivity: "standard", phash: "ph1", ai_verdict: "Probabile AI-generated", created_at: "2026-06-18T00:00:00Z" },
    { id: "m2", source_url: "https://ad-network.io/b.jpg", host: "ad-network.io", score: 58, band: "review", sensitivity: "standard", phash: "ph2", ai_verdict: null, created_at: "2026-06-17T00:00:00Z" },
    { id: "m3", source_url: "https://anon.xx/c.jpg", host: "anon.xx", score: 91, band: "confirmed", sensitivity: "sensitive", phash: "ph3", ai_verdict: null, created_at: "2026-06-16T00:00:00Z" },
    { id: "m4", source_url: "https://hidden.zz/d.jpg", host: "hidden.zz", score: 0, band: "confirmed", sensitivity: "minor", phash: null, ai_verdict: null, created_at: "2026-06-15T00:00:00Z" },
  ],
  nemesis: [
    { id: "n1", scan_match_id: "m1", kind: "dmca", status: "sent" },
    { id: "n2", scan_match_id: "m2", kind: "gdpr17", status: "removed" },
  ],
  evidence: [
    { id: "e1", scan_match_id: "m1", hash: "0xabc", anchored_at: "2026-06-19T00:00:00Z", created_at: "2026-06-19T00:00:00Z", whois: { registrar: "Ned-Host LLC", domain: "unknown-host.ru" } },
  ],
  nowIso: "2026-06-19T10:02:00Z",
};

describe("buildWardData", () => {
  it("identita' e stato dal consenso", () => {
    const d = buildWardData(base);
    expect(d.identity.handle).toBe("greta");
    expect(d.identity.consent).toBe("active");
    expect(d.identity.coreId).toMatch(/^0x[0-9A-F]{4}$/);
    expect(d.status).toBe("protected");
  });

  it("at_risk se il consenso non e' attivo", () => {
    expect(buildWardData({ ...base, consentStatus: "revoked" }).status).toBe("at_risk");
    expect(buildWardData({ ...base, consentStatus: "revoked" }).identity.consent).toBe("revoked");
  });

  it("stats: confirmed/review contati, cleared = somma discarded dei job", () => {
    const d = buildWardData(base);
    expect(d.stats.confirmed).toBe(3); // m1 + m3 + m4 (tutti band confirmed)
    expect(d.stats.review).toBe(1); // m2
    expect(d.stats.cleared).toBe(209); // 200 + 9
  });

  it("blip uno per match, severita' dalla band, dentro il quadrante", () => {
    const d = buildWardData(base);
    expect(d.blips).toHaveLength(4);
    expect(d.blips[0].sev).toBe("c"); // confirmed
    expect(d.blips[1].sev).toBe("a"); // review
    for (const b of d.blips) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(100);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(100);
    }
  });

  it("detection standard: campi pieni + tag evidenza + registrar dal whois", () => {
    const d = buildWardData(base);
    const m1 = d.detections.find((x) => x.id === "m1")!;
    expect(m1.dom).toBe("unknown-host.ru");
    expect(m1.score).toBe(94);
    expect(m1.band).toBe("confirmed");
    expect(m1.url).toContain("unknown-host.ru");
    expect(m1.registrar).toBe("Ned-Host LLC");
    expect(m1.hash).toBe("ph1");
    expect(m1.aiVerdict).toBe("Probabile AI-generated");
    expect(m1.evidence).toContain("screenshot");
    expect(m1.evidence).toContain("AI-flag"); // c'e' ai_verdict
    expect(m1.pageUrl).toBe("https://unknown-host.ru/post/1");
  });

  it("detection sensibile: url e pagina nascosti fino al reveal", () => {
    const m3 = buildWardData(base).detections.find((x) => x.id === "m3")!;
    expect(m3.sensitivity).toBe("sensitive");
    expect(m3.url.toLowerCase()).toContain("nascosto");
    expect(m3.pageUrl).toBeUndefined();
  });

  it("detection minore: LOCKED, niente host/url/dettagli", () => {
    const m4 = buildWardData(base).detections.find((x) => x.id === "m4")!;
    expect(m4.sensitivity).toBe("minor");
    expect(m4.dom).not.toContain("hidden.zz");
    expect(m4.url).not.toContain("hidden.zz");
    expect(m4.host).not.toContain("hidden.zz");
    expect(m4.evidence).toEqual([]);
  });

  it("ops dai nemesis_actions con host del match e stato mappato", () => {
    const d = buildWardData(base);
    expect(d.ops).toHaveLength(2);
    const o1 = d.ops.find((o) => o.dom === "unknown-host.ru")!;
    expect(o1.status).toBe("pending"); // sent -> pending
    const o2 = d.ops.find((o) => o.dom === "ad-network.io")!;
    expect(o2.status).toBe("removed");
  });

  it("nemesis counts: landed/inProgress/escalated", () => {
    const d = buildWardData(base);
    expect(d.nemesis.landed).toBe(1); // removed
    expect(d.nemesis.inProgress).toBe(1); // sent
    expect(d.nemesis.escalated).toBe(0);
  });

  it("vault dagli evidence_records con host/score del match", () => {
    const d = buildWardData(base);
    expect(d.vault).toHaveLength(1);
    expect(d.vault[0].dom).toBe("unknown-host.ru");
    expect(d.vault[0].score).toBe(94);
    expect(d.vault[0].hash).toBe("0xabc");
  });

  it("caso vuoto: zero ovunque, niente crash", () => {
    const d = buildWardData({ ...base, matches: [], nemesis: [], evidence: [], jobs: [] });
    expect(d.stats).toEqual({ confirmed: 0, review: 0, cleared: 0 });
    expect(d.detections).toEqual([]);
    expect(d.ops).toEqual([]);
    expect(d.vault).toEqual([]);
    expect(d.blips).toEqual([]);
    expect(d.lastSweep).toBe("mai");
  });
});
