import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyDiditWebhook, diditStatusToKyc, extractDobFromDecision } from "./didit";

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

describe("extractDobFromDecision", () => {
  it("legge la data dal primo id_verification (radice)", () => {
    const data = { id_verifications: [{ date_of_birth: "1990-05-10", portrait_image: "x" }] };
    expect(extractDobFromDecision(data)).toBe("1990-05-10");
  });
  it("legge la data quando id_verifications e' annidato sotto decision", () => {
    const data = { decision: { id_verifications: [{ date_of_birth: "2001-12-01" }] } };
    expect(extractDobFromDecision(data)).toBe("2001-12-01");
  });
  it("null se manca la data", () => {
    expect(extractDobFromDecision({ id_verifications: [{ portrait_image: "x" }] })).toBeNull();
  });
  it("null se il formato e' sbagliato", () => {
    expect(extractDobFromDecision({ id_verifications: [{ date_of_birth: "10/05/1990" }] })).toBeNull();
  });
  it("null su payload vuoto o non-oggetto", () => {
    expect(extractDobFromDecision(null)).toBeNull();
    expect(extractDobFromDecision("x")).toBeNull();
  });
  it("legge la data da un oggetto kyc (path alternativo Didit)", () => {
    const data = { decision: { kyc: { status: "Approved", date_of_birth: "1985-03-22" } } };
    expect(extractDobFromDecision(data)).toBe("1985-03-22");
  });
  it("legge la data da id_verification singolare", () => {
    const data = { id_verification: { date_of_birth: "1992-07-07", portrait_image: "x" } };
    expect(extractDobFromDecision(data)).toBe("1992-07-07");
  });
  it("accetta anche dateOfBirth camelCase", () => {
    expect(extractDobFromDecision({ kyc: { dateOfBirth: "1988-11-11" } })).toBe("1988-11-11");
  });
  it("trova la data a qualunque profondita'", () => {
    const data = { a: { b: [{ c: { date_of_birth: "1979-01-02" } }] } };
    expect(extractDobFromDecision(data)).toBe("1979-01-02");
  });
});
