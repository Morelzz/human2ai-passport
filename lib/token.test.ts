import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { computeTokenHash, truncateToken } from "./token";

describe("computeTokenHash", () => {
  it("è SHA256(id|consent_start), senza categorie", () => {
    const id = "abc-123";
    const start = "2026-06-22";
    const expected = crypto.createHash("sha256").update(`${id}|${start}`).digest("hex");
    expect(computeTokenHash(id, start)).toBe(expected);
  });

  it("token diversi per consent_start diversi (la timeline conta)", () => {
    expect(computeTokenHash("x", "2026-01-01")).not.toBe(computeTokenHash("x", "2026-01-02"));
  });

  it("token diversi per id diversi", () => {
    expect(computeTokenHash("a", "2026-01-01")).not.toBe(computeTokenHash("b", "2026-01-01"));
  });
});

describe("truncateToken", () => {
  it("mostra i primi 16 caratteri con ellissi", () => {
    const h = computeTokenHash("abc-123", "2026-06-22");
    expect(truncateToken(h)).toBe(h.slice(0, 16) + "…");
  });
});
