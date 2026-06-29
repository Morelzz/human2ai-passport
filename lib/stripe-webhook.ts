import crypto from "crypto";

// Verifica della firma dei webhook Stripe SENZA SDK (coerente con lib/stripe.ts).
// Stripe firma `${timestamp}.${payload}` in HMAC-SHA256 con il webhook secret e
// la mette nell'header `Stripe-Signature` come `t=...,v1=...`. Confronto a tempo
// costante + finestra anti-replay. Logica pura: testabile senza rete.

export function verifyStripeSignature(
  payload: string,
  sigHeader: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec?: number
): boolean {
  if (!sigHeader || !secret) return false;

  // Header: coppie "k=v" separate da virgola; v1 puo' comparire piu' volte.
  let t: string | undefined;
  const v1: string[] = [];
  for (const part of sigHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v);
  }
  if (!t || v1.length === 0) return false;

  // Anti-replay: scarta firme troppo vecchie/future.
  const ts = Number(t);
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceSec) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  return v1.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length !== expectedBuf.length) return false;
    try {
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}
