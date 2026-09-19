import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, type Riga } from "./test/db-finto";

let tabelle: Record<string, Riga[]>;
vi.mock("@/lib/supabase", () => ({ createServerClient: () => db(tabelle) }));
vi.mock("@/lib/site", () => ({ siteUrl: () => "https://semblic.com" }));

import { buildComplianceReceipt } from "./receipt";

const FOTO = "f".repeat(64);
const VIDEO = "v".repeat(64);

beforeEach(() => {
  tabelle = {
    generations: [{
      id: "gen-1", certificate: FOTO, category: null, mode: "commercial", created_at: "2026-09-19T10:00:00Z", identity_score: 93,
      avatars: { handle: "gabriella", alias: "Gabriella", consent_start: "2026-06-01", commercial_consent: true, revoked_at: null },
    }],
    generation_people: [],
    animations: [{ id: "a-1", certificate: VIDEO, status: "done", source_generation_id: "gen-1", seconds: 5, identity_score: 91, created_at: "2026-09-19T11:00:00Z", finished_at: "2026-09-19T11:03:00Z" }],
  };
});

describe("ricevuta", () => {
  it("foto: come prima", async () => {
    const r = await buildComplianceReceipt(FOTO, "2026-09-19T12:00:00Z");
    expect(r?.subject.alias).toBe("Gabriella");
    expect(r?.likeness.score).toBe(93);
    expect(r?.video).toBeUndefined();
  });

  it("video: nasce dallo scatto di partenza, col suo certificato e la sua somiglianza", async () => {
    const r = await buildComplianceReceipt(VIDEO, "2026-09-19T12:00:00Z");
    expect(r?.certificate).toBe(VIDEO);
    expect(r?.subject.alias).toBe("Gabriella");
    expect(r?.generation.mode).toBe("video");
    expect(r?.generation.date).toBe("2026-09-19");
    expect(r?.likeness.score).toBe(91);
    expect(r?.video).toEqual({ seconds: 5, source_certificate: FOTO, source_receipt_url: `https://semblic.com/receipt/${FOTO}` });
  });

  it("un video non ancora consegnato non ha ricevuta", async () => {
    tabelle.animations[0].status = "finishing";
    expect(await buildComplianceReceipt(VIDEO, "2026-09-19T12:00:00Z")).toBeNull();
  });

  it("certificato sconosciuto: nessuna ricevuta", async () => {
    expect(await buildComplianceReceipt("x".repeat(64), "2026-09-19T12:00:00Z")).toBeNull();
  });
});
