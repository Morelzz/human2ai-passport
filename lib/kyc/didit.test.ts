import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyDiditWebhook, diditStatusToKyc } from "./didit";

const SECRET = "test_webhook_secret_123";

function hmac(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data, "utf8").digest("hex");
}

// Replica la canonicalizzazione del client (chiavi ordinate ricorsivamente).
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) o[k] = sortKeys((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}

function makePayload(over: Record<string, unknown> = {}) {
  return {
    session_id: "sess_abc",
    status: "Approved",
    vendor_data: "user-uuid-1",
    webhook_type: "status.updated",
    created_at: Math.floor(Date.now() / 1000),
    ...over,
  };
}

describe("verifyDiditWebhook", () => {
  beforeEach(() => {
    process.env.DIDIT_WEBHOOK_SECRET = SECRET;
  });

  it("accetta una firma raw valida (HMAC del body grezzo)", () => {
    const payload = makePayload();
    const raw = JSON.stringify(payload);
    const headers = new Headers({ "x-signature": hmac(raw) });
    const res = verifyDiditWebhook(raw, headers);
    expect(res.ok).toBe(true);
    expect(res.payload?.vendor_data).toBe("user-uuid-1");
  });

  it("accetta una firma simple valida (campi specifici)", () => {
    const payload = makePayload();
    const raw = JSON.stringify(payload);
    const canonical = `${payload.created_at}:${payload.session_id}:${payload.status}:${payload.webhook_type}`;
    const headers = new Headers({ "x-signature-simple": hmac(canonical) });
    expect(verifyDiditWebhook(raw, headers).ok).toBe(true);
  });

  it("accetta una firma V2 valida (JSON canonico, chiavi ordinate)", () => {
    const payload = makePayload();
    const canonical = JSON.stringify(sortKeys(payload));
    const headers = new Headers({ "x-signature-v2": hmac(canonical), "x-timestamp": String(payload.created_at) });
    expect(verifyDiditWebhook(JSON.stringify(payload), headers).ok).toBe(true);
  });

  it("rifiuta una firma manomessa", () => {
    const raw = JSON.stringify(makePayload());
    const headers = new Headers({ "x-signature": hmac(raw) + "00" });
    expect(verifyDiditWebhook(raw, headers).ok).toBe(false);
  });

  it("rifiuta un body manomesso dopo la firma (replay/tamper)", () => {
    const original = makePayload({ status: "Declined" });
    const sig = hmac(JSON.stringify(original));
    // Stesso created_at, ma status falsificato in "Approved".
    const tampered = JSON.stringify({ ...original, status: "Approved" });
    const headers = new Headers({ "x-signature": sig });
    expect(verifyDiditWebhook(tampered, headers).ok).toBe(false);
  });

  it("rifiuta un webhook scaduto (created_at oltre 300s)", () => {
    const payload = makePayload({ created_at: Math.floor(Date.now() / 1000) - 600 });
    const raw = JSON.stringify(payload);
    const headers = new Headers({ "x-signature": hmac(raw) });
    expect(verifyDiditWebhook(raw, headers).ok).toBe(false);
  });

  it("rifiuta se manca il secret", () => {
    delete process.env.DIDIT_WEBHOOK_SECRET;
    const raw = JSON.stringify(makePayload());
    const headers = new Headers({ "x-signature": hmac(raw) });
    expect(verifyDiditWebhook(raw, headers).ok).toBe(false);
  });
});

describe("diditStatusToKyc", () => {
  it("mappa gli stati Didit su kyc_status", () => {
    expect(diditStatusToKyc("Approved")).toBe("approved");
    expect(diditStatusToKyc("Declined")).toBe("rejected");
    expect(diditStatusToKyc("In Review")).toBe("pending");
    expect(diditStatusToKyc("In Progress")).toBe("pending");
    expect(diditStatusToKyc("Abandoned")).toBe(null);
    expect(diditStatusToKyc("Expired")).toBe(null);
  });
});
