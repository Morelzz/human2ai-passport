import { describe, it, expect } from "vitest";
import { shouldPruneSubscription } from "./send";

describe("shouldPruneSubscription", () => {
  it("pota gli endpoint scaduti (404, 410)", () => {
    expect(shouldPruneSubscription(404)).toBe(true);
    expect(shouldPruneSubscription(410)).toBe(true);
  });

  it("conserva la subscription su errori transitori o assenti", () => {
    expect(shouldPruneSubscription(429)).toBe(false);
    expect(shouldPruneSubscription(500)).toBe(false);
    expect(shouldPruneSubscription(undefined)).toBe(false);
  });
});
