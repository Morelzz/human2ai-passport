import { describe, it, expect, vi, afterEach } from "vitest";
import { isProdLike, reportDegradation } from "./observability";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isProdLike (guardia stub + allarmi)", () => {
  it("false in sviluppo (NODE_ENV development, niente Vercel)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isProdLike()).toBe(false);
  });

  it("true se NODE_ENV=production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isProdLike()).toBe(true);
  });

  it("true su Vercel anche fuori da production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isProdLike()).toBe(true);
  });
});

describe("reportDegradation", () => {
  it("non lancia mai (l'osservabilita non deve rompere il flusso)", () => {
    expect(() => reportDegradation("veto.scan_unavailable", { protectedEntries: 3 })).not.toThrow();
  });
});
