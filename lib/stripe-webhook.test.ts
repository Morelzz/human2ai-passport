import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyStripeSignature } from "./stripe-webhook";

const SECRET = "whsec_test_segreto";

function sign(payload: string, ts: number, secret = SECRET): string {
  const v1 = crypto.createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
  return `t=${ts},v1=${v1}`;
}

describe("verifyStripeSignature", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = 1_700_000_000;

  it("accetta una firma valida e recente", () => {
    expect(verifyStripeSignature(payload, sign(payload, now), SECRET, 300, now)).toBe(true);
  });

  it("rifiuta una firma con secret sbagliato", () => {
    expect(verifyStripeSignature(payload, sign(payload, now, "whsec_altro"), SECRET, 300, now)).toBe(false);
  });

  it("rifiuta un payload manomesso", () => {
    const sig = sign(payload, now);
    expect(verifyStripeSignature(payload + "x", sig, SECRET, 300, now)).toBe(false);
  });

  it("rifiuta una firma fuori finestra (replay)", () => {
    const old = now - 10_000;
    expect(verifyStripeSignature(payload, sign(payload, old), SECRET, 300, now)).toBe(false);
  });

  it("rifiuta header o secret mancanti", () => {
    expect(verifyStripeSignature(payload, null, SECRET, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(payload, now), "", 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, "t=123", SECRET, 300, now)).toBe(false);
  });

  it("accetta piu' firme v1 se almeno una e' valida", () => {
    const good = crypto.createHmac("sha256", SECRET).update(`${now}.${payload}`).digest("hex");
    const header = `t=${now},v1=deadbeef,v1=${good}`;
    expect(verifyStripeSignature(payload, header, SECRET, 300, now)).toBe(true);
  });
});
