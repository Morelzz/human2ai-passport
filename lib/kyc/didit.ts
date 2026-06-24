import crypto from "crypto";
import { siteUrl } from "../site";

// ──────────────────────────────────────────────────────────────────────────
// Didit KYC — client server-only. Verifica d'identita' automatica (documento +
// liveness + face match) tramite il flusso ospitato da Didit.
//   1. createDiditSession: apre una sessione (vendor_data = user.id per
//      correlare il webhook al profilo) e torna l'URL da redirezionare.
//   2. verifyDiditWebhook: verifica la firma del webhook (anti-manomissione) +
//      la freschezza (anti-replay).
//   3. diditStatusToKyc: mappa lo stato Didit su profiles.kyc_status.
// Le credenziali stanno SOLO in env (mai nel client, mai committate).
// Riferimento: docs.didit.me (v3) + demo ufficiale Next.js.
// ──────────────────────────────────────────────────────────────────────────

const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || "https://verification.didit.me";

export function diditConfigured(): boolean {
  return Boolean(process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_ID);
}

export interface DiditWebhookPayload {
  event_id?: string;
  session_id: string;
  status: string;
  webhook_type?: string;
  vendor_data?: string;
  created_at?: number;
  timestamp?: number;
  environment?: string;
  decision?: unknown;
}

// Serializzazione canonica del payload = chiavi ordinate RICORSIVAMENTE +
// separatori compatti (JSON.stringify di default) + unicode preservato. Replica
// il JSON canonico con cui Didit firma X-Signature-V2 (la firma raccomandata).
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}

// Crea una sessione di verifica e ritorna l'URL ospitato da Didit.
export async function createDiditSession(vendorData: string): Promise<{ url: string; sessionId: string }> {
  const apiKey = process.env.DIDIT_API_KEY;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;
  if (!apiKey || !workflowId) throw new Error("Didit non configurato (DIDIT_API_KEY / DIDIT_WORKFLOW_ID)");

  const res = await fetch(`${DIDIT_BASE_URL}/v3/session/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: vendorData,
      // Dopo la verifica Didit riporta l'utente qui; lo stato vero arriva dal webhook.
      callback: `${siteUrl()}/account/verify?didit=done`,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = data.message ?? data.error ?? data.detail ?? `Didit ha risposto ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Errore creazione sessione Didit");
  }
  if (typeof data.url !== "string") throw new Error("Didit: risposta senza url di verifica");
  return { url: data.url, sessionId: String(data.session_id ?? "") };
}

// Recupera dalla decisione di una sessione il VOLTO verificato dal documento
// (id_verifications[].portrait_image). I link immagine sono presigned a scadenza
// breve: vanno scaricati subito. null se non disponibile.
export async function getDiditPortraitUrl(sessionId: string): Promise<string | null> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey || !sessionId) return null;
  const res = await fetch(`${DIDIT_BASE_URL}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return null;
  // La decisione puo' avere id_verifications in radice o sotto "decision".
  const decision = (data.decision as Record<string, unknown> | undefined) ?? data;
  const idv = Array.isArray(decision.id_verifications) ? (decision.id_verifications as Record<string, unknown>[]) : [];
  for (const v of idv) {
    if (typeof v.portrait_image === "string" && v.portrait_image) return v.portrait_image;
  }
  return null;
}

// Estrae la data di nascita (YYYY-MM-DD) dalla decisione Didit, dallo stesso
// array id_verifications[] da cui leggiamo il portrait. PURA e testabile.
// null se assente o malformata: il chiamante (webhook) la tratta fail-closed.
export function extractDobFromDecision(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const decision = (root.decision as Record<string, unknown> | undefined) ?? root;
  const idv = Array.isArray(decision.id_verifications)
    ? (decision.id_verifications as Record<string, unknown>[])
    : [];
  for (const v of idv) {
    const dob = v.date_of_birth;
    if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  }
  return null;
}

// Recupera la data di nascita verificata dal documento per una sessione. null se
// non disponibile (sessione non trovata, decisione senza data, ecc.).
export async function getDiditDob(sessionId: string): Promise<string | null> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey || !sessionId) return null;
  const res = await fetch(`${DIDIT_BASE_URL}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as unknown;
  return extractDobFromDecision(data);
}

// Verifica un webhook Didit. Imponiamo la freschezza (X-Timestamp entro 300s,
// anti-replay) e accettiamo UNA firma valida (timing-safe) tra le tre che Didit
// invia, in ordine di robustezza: V2 (JSON canonico, raccomandata), raw (body
// grezzo esatto), simple (campi specifici, non autentica il corpo decisione).
// NB: il body grezzo NON viene mai ri-serializzato per la firma raw; il
// canonico (V2) e' la forma con cui Didit firma e va ricostruito apposta.
export function verifyDiditWebhook(rawBody: string, headers: Headers): { ok: boolean; payload: DiditWebhookPayload | null } {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) return { ok: false, payload: null };

  let payload: DiditWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DiditWebhookPayload;
  } catch {
    return { ok: false, payload: null };
  }

  // Freschezza obbligatoria (anti-replay): X-Timestamp (header) entro 5 minuti,
  // con fallback ai timestamp del body se l'header manca.
  const ts = Number(headers.get("x-timestamp") ?? payload.timestamp ?? payload.created_at);
  if (!Number.isFinite(ts)) return { ok: false, payload: null };
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return { ok: false, payload: null };

  const hmac = (data: string) => crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
  const safeEq = (a: string, b: string) => {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  };

  // 1) X-Signature-V2 (raccomandata): HMAC sul JSON canonico (chiavi ordinate).
  const sigV2 = headers.get("x-signature-v2");
  if (sigV2 && safeEq(hmac(JSON.stringify(canonicalize(payload))), sigV2)) return { ok: true, payload };
  // 2) X-Signature: HMAC sul body grezzo esatto (preservato dal route handler).
  const sigRaw = headers.get("x-signature");
  if (sigRaw && safeEq(hmac(rawBody), sigRaw)) return { ok: true, payload };
  // 3) X-Signature-Simple (fallback): "{ts}:{session_id}:{status}:{webhook_type}".
  const sigSimple = headers.get("x-signature-simple");
  if (sigSimple) {
    const canonical = `${ts}:${payload.session_id}:${payload.status}:${payload.webhook_type ?? ""}`;
    if (safeEq(hmac(canonical), sigSimple)) return { ok: true, payload };
  }

  return { ok: false, payload: null };
}

// Mappa lo stato Didit (case-sensitive) su profiles.kyc_status. Gli stati non
// terminali (in corso) tengono "pending"; gli abbandoni/scadenze non forzano
// alcun cambiamento (l'utente puo' riprovare).
export function diditStatusToKyc(status: string): "approved" | "rejected" | "pending" | null {
  switch (status) {
    case "Approved":
      return "approved";
    case "Declined":
      return "rejected";
    case "In Review":
    case "In Progress":
    case "Resubmitted":
    case "Awaiting User":
      return "pending";
    default:
      // Not Started / Abandoned / Expired / Kyc Expired: nessun cambio forzato.
      return null;
  }
}
