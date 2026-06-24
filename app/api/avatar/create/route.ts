import { NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { uploadPrivate } from "@/lib/storage";
import { computeTokenHash, consentTokenExpiry } from "@/lib/token";
import { IDENTITY_KIT, Tier } from "@/lib/types";
import { classifyIdentityMatch } from "@/lib/identity-match";
import type { FaceMatchResult } from "@/lib/face-match";

export const runtime = "nodejs";
// Il gate identità embedda il portrait verificato + fino a 5 foto con face-api
// (WASM) a freddo: diamo margine per evitare un timeout che maschererebbe il gate.
export const maxDuration = 60;

const REFERENCES_BUCKET = "references";
// Documento e selfie della verifica identità: bucket PRIVATO 'documents' (come VETO).
const DOCUMENTS_BUCKET = "documents";

function finiteNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Un legame del match: accetta solo numeri nei range attesi (il client potrebbe
// inviare qualsiasi cosa: il dato è un AIUTO, non una prova, quindi lo sanifichiamo).
function sanitizeLeg(v: unknown): { distance: number; similarity: number } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const d = finiteNum(o.distance);
  if (d === null) return null;
  const s = finiteNum(o.similarity);
  return {
    distance: Math.max(0, Math.min(4, d)),
    similarity: s === null ? 0 : Math.max(0, Math.min(100, Math.round(s))),
  };
}

// Match volto sanificato dal body (mai i pixel: solo distanze/similarità + esiti).
function sanitizeFaceMatch(fm: unknown): FaceMatchResult | null {
  if (!fm || typeof fm !== "object") return null;
  const f = fm as Record<string, unknown>;
  const ff = (f.faces_found && typeof f.faces_found === "object") ? f.faces_found as Record<string, unknown> : {};
  return {
    engine: "face-api-client",
    doc_selfie: sanitizeLeg(f.doc_selfie),
    selfie_photo: sanitizeLeg(f.selfie_photo),
    faces_found: { document: !!ff.document, selfie: !!ff.selfie, photo: !!ff.photo },
    computed_at: typeof f.computed_at === "string" ? f.computed_at.slice(0, 40) : new Date().toISOString(),
  };
}

// Decodifica un data-url immagine e lo ridimensiona a ≤1024px (JPEG) per lo
// storage del reference-set (identity-lock dei motori ECHO/TWIN).
async function refFromDataUrl(dataUrl: unknown): Promise<Buffer | null> {
  if (typeof dataUrl !== "string") return null;
  const m = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    return await sharp(Buffer.from(m[1], "base64"))
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    return null;
  }
}
const HANDLE_RE = /^[a-z0-9-]{3,30}$/;

export async function POST(request: Request) {
  // 1. Identità: chi sta creando?
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // 2. Autorizzazione: deve essere un creatore verificato
  const { data: profile } = await auth
    .from("profiles")
    .select("role, kyc_status, full_name")
    .eq("id", user.id)
    .single();

  // Le organizzazioni (Enterprise) onboardano più avatar; i privati uno solo.
  const isEnterprise = profile?.role === "enterprise";
  if (profile?.role !== "seller" && !isEnterprise) {
    return NextResponse.json({ error: "Solo Creatori o organizzazioni possono creare un avatar" }, { status: 403 });
  }
  // Il privato verifica sé stesso (KYC); l'org passa dalla revisione operatori.
  if (!isEnterprise && profile?.kyc_status !== "approved") {
    return NextResponse.json({ error: "Devi prima verificare la tua identità (KYC)" }, { status: 403 });
  }

  const admin = createServerClient();

  // Enterprise: l'azienda deve aver superato il KYB prima di onboardare il roster.
  // Recupera l'organizzazione del titolare e lega l'avatar a org_id.
  let orgId: string | null = null;
  if (isEnterprise) {
    const { data: org } = await admin
      .from("organizations")
      .select("id, kyb_status")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!org) {
      return NextResponse.json({ error: "Registra prima la tua azienda (KYB)." }, { status: 403 });
    }
    if (org.kyb_status !== "approved") {
      return NextResponse.json({ error: "La tua azienda è in verifica: potrai onboardare avatar dopo l'approvazione del KYB." }, { status: 403 });
    }
    orgId = org.id;
  }

  // 3. Vincolo 1:1 SOLO per i privati. Le organizzazioni possono averne molti.
  if (!isEnterprise) {
    const { count } = await admin
      .from("avatars")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "Hai già un avatar nel registro" }, { status: 409 });
    }
  }

  // 4. Validazione input
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const handle = String(body.handle ?? "").trim().toLowerCase();
  const alias = String(body.alias ?? "").trim();
  // Il livello non lo sceglie l'utente: nasce ECHO (tier SOUL), lo assegniamo noi dopo.
  const tier: Tier = "SOUL";
  // Niente piu categorie: un avatar "aperto" acconsente a ogni uso commerciale.
  const commercialConsent = body.commercial_consent !== false;

  // Identity kit (immutabile)
  const gender = String(body.gender ?? "");
  const ageRange = String(body.age_range ?? "");
  const ethnicity = String(body.ethnicity ?? "");
  const hairColor = String(body.hair_color ?? "");
  const eyeColor = String(body.eye_color ?? "");
  const bodyType = String(body.body_type ?? "");
  const height = String(body.height ?? "");
  const facialHair = String(body.facial_hair ?? "");
  const glasses = String(body.glasses ?? "");
  const tattoos = String(body.tattoos ?? "");
  const language = String(body.language ?? "");

  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ error: "Handle non valido (3-30 caratteri: a-z, 0-9, trattino)" }, { status: 400 });
  }
  if (alias.length < 2) {
    return NextResponse.json({ error: "Nome troppo corto" }, { status: 400 });
  }
  if (!commercialConsent) {
    return NextResponse.json({ error: "Serve il consenso all'uso commerciale per creare un avatar (per la sola protezione del volto usa Ward)." }, { status: 400 });
  }
  // ECHO e identity-locked: senza reference l'avatar non sarebbe generabile.
  const providedRefCount = Array.isArray(body.references) ? body.references.length : 0;
  if (providedRefCount === 0) {
    return NextResponse.json({ error: "Carica almeno una foto: bloccano l'identità reale per le generazioni fedeli." }, { status: 400 });
  }

  // Tutti i campi dell'identity kit sono obbligatori e devono essere tra le opzioni valide
  const kit: Record<string, string> = {
    gender, age_range: ageRange, ethnicity, hair_color: hairColor, eye_color: eyeColor, body_type: bodyType,
    height, facial_hair: facialHair, glasses, tattoos, language,
  };
  for (const [field, value] of Object.entries(kit)) {
    const allowed = IDENTITY_KIT[field as keyof typeof IDENTITY_KIT] as readonly string[];
    if (!allowed.includes(value)) {
      return NextResponse.json({ error: `Identity kit incompleto o non valido: ${field}` }, { status: 400 });
    }
  }
  // Verifica identità (Fase 3b): pre-screening del match calcolato sul dispositivo.
  // AIUTO alla certificazione manuale, mai una prova. Salvato sanificato + esito.
  const fm = sanitizeFaceMatch(body.face_match);
  const idVerdict = classifyIdentityMatch(fm);
  const identityMatch = fm ? { ...fm, verdict: idVerdict.verdict, score: idVerdict.score } : null;

  // Gate identità (anti-impersonazione): per i privati il volto delle foto deve
  // corrispondere al volto VERIFICATO col KYC (Didit). Confronto SERVER-side sui
  // bytes; se nemmeno la foto migliore combacia (banda "weak", distanza >0.6) si
  // blocca. Se non c'è riferimento (link Didit scaduto, nessun volto leggibile)
  // niente blocco cieco: l'avatar resta in revisione manuale, come già previsto.
  if (!isEnterprise) {
    const { checkBestFaceAgainstIdentity, IdentityModelsUnavailableError } = await import("@/lib/kyc/identity-face");
    const refImgs: Uint8Array[] = [];
    for (const r of (Array.isArray(body.references) ? body.references.slice(0, 5) : [])) {
      const buf = await refFromDataUrl(r?.data);
      if (buf) refImgs.push(buf);
    }
    let idCheck = null;
    try {
      idCheck = refImgs.length ? await checkBestFaceAgainstIdentity(user.id, refImgs) : null;
    } catch (e) {
      // CRIT-6 (fail-closed): se il gate anti-impersonazione non puo girare
      // (modelli face-api non caricati) NON creiamo un avatar non verificato:
      // meglio chiedere di riprovare. L'allarme e gia stato emesso a monte.
      if (e instanceof IdentityModelsUnavailableError) {
        return NextResponse.json(
          { error: "Verifica del volto temporaneamente non disponibile, riprova tra poco." },
          { status: 503 },
        );
      }
      throw e;
    }
    if (idCheck && idCheck.band === "weak") {
      return NextResponse.json(
        { error: "Il volto delle foto non corrisponde al documento con cui ti sei verificato. Carica foto del tuo volto, lo stesso del KYC." },
        { status: 403 },
      );
    }
  }

  // 5. Handle univoco
  const { data: existing } = await admin.from("avatars").select("id").eq("handle", handle).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Questo handle è già in uso" }, { status: 409 });
  }

  // 6. Inserimento
  const id = crypto.randomUUID();
  const consentStart = new Date().toISOString().slice(0, 10);
  const tokenHash = computeTokenHash(id, consentStart);
  // Nessun ritratto esterno: l'avatar visivo è generato localmente (lib/avatar-art) al render.
  const portraitUrl: string | null = null;
  // Enterprise: token per il consenso "persona-nel-loop" (link da condividere).
  const consentToken = isEnterprise ? crypto.randomBytes(24).toString("hex") : null;

  const { error: insErr } = await admin.from("avatars").insert({
    id,
    owner_id: user.id,
    handle,
    alias,
    portrait_url: portraitUrl,
    tier,
    gender,
    age_range: ageRange,
    ethnicity,
    hair_color: hairColor,
    eye_color: eyeColor,
    body_type: bodyType,
    height,
    facial_hair: facialHair,
    glasses,
    tattoos,
    language,
    // Consenso uso commerciale sì/no (modello senza categorie). La creazione
    // richiede comunque il consenso (sopra), quindi qui è sempre true; resta un
    // campo perché in futuro è togglabile da /account/consent.
    commercial_consent: commercialConsent,
    consent_start: consentStart,
    token_hash: tokenHash,
    usage_count: 0,
    royalty_accrued_cents: 0,
    is_demo: false,
    org_id: orgId,
    // Hard point identita: NESSUN avatar va live in automatico. Anche il privato
    // passa dalla certificazione manuale (volto = documento = selfie) prima di
    // diventare pubblico. Coda in /api/admin/review (UI /account/review).
    verification_status: "pending_review",
    consent_token: consentToken,
    // M12: il link di consenso (Enterprise) scade, non vive in eterno.
    consent_token_expires_at: consentToken ? consentTokenExpiry(new Date().toISOString()) : null,
    identity_match: identityMatch,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Profilo pubblico facoltativo (nome reale + social). UPDATE separato e
  // best-effort: se la migrazione avatar_public_profile.sql non è ancora
  // applicata, la creazione dell'avatar NON deve fallire.
  const realName = String(body.real_name ?? "").trim().slice(0, 80) || null;
  const instagram = String(body.instagram ?? "").trim().replace(/^@/, "").slice(0, 120) || null;
  const facebook = String(body.facebook ?? "").trim().replace(/^@/, "").slice(0, 120) || null;
  if (realName || instagram || facebook) {
    await admin
      .from("avatars")
      .update({ real_name: realName, instagram, facebook })
      .eq("id", id)
      .then(() => undefined, () => undefined);
  }

  await admin.from("consent_events").insert({
    avatar_id: id,
    event_type: "GRANTED",
    detail: isEnterprise ? "Onboarding avviato dall'organizzazione (in attesa del consenso della persona)" : "Consenso iniziale (onboarding creatore)",
    occurred_at: consentStart,
  });

  // Reference-set: salva le foto caricate (8 pose) nel bucket privato cifrato,
  // sotto {handle}/, così l'avatar diventa generabile con ECHO (identity-lock).
  // Best-effort: un problema di storage NON annulla la creazione dell'avatar.
  let refsStored = 0;
  const rawRefs = Array.isArray(body.references) ? body.references.slice(0, 8) : [];
  for (const r of rawRefs) {
    const buf = await refFromDataUrl(r?.data);
    if (!buf) continue;
    const slot = String(Math.max(0, Math.min(7, Number(r?.slot) || 0))).padStart(2, "0");
    try {
      await uploadPrivate(REFERENCES_BUCKET, `${handle}/ref-${slot}.jpg`, buf, "image/jpeg");
      refsStored++;
    } catch {
      /* storage non disponibile: l'avatar resta valido, le reference si potranno ricaricare */
    }
  }

  // Se l'utente HA fornito foto ma NESSUNA e' stata salvata (storage ko o payload
  // troncato), non lasciare un avatar non generabile: rollback e chiedi di riprovare.
  if (rawRefs.length > 0 && refsStored === 0) {
    await admin.from("consent_events").delete().eq("avatar_id", id);
    await admin.from("avatars").delete().eq("id", id);
    return NextResponse.json({ error: "Non siamo riusciti a salvare le tue foto, riprova (se persiste usa immagini piu' leggere o meno foto)." }, { status: 502 });
  }

  // Documento (fronte) + selfie nel bucket PRIVATO 'documents' sotto {uid}/avatar/
  // (stessa convenzione del VETO). Servono ai nostri operatori per certificare a
  // mano che il volto dell'avatar sia la stessa persona del documento e del selfie.
  // Best-effort: un problema di storage NON annulla la creazione dell'avatar.
  const ownerId = user.id;
  async function storeIdImage(dataUrl: unknown, name: string) {
    const buf = await refFromDataUrl(dataUrl);
    if (!buf) return;
    try {
      await uploadPrivate(DOCUMENTS_BUCKET, `${ownerId}/avatar/${name}.jpg`, buf, "image/jpeg");
    } catch {
      /* audit best-effort: l'avatar resta valido */
    }
  }
  await storeIdImage(body.document_front, "document-front");
  await storeIdImage(body.selfie, "selfie");

  // Per le org: link tokenizzato che la persona deve aprire per confermare il consenso.
  const consentUrl = consentToken ? `${new URL(request.url).origin}/consent/${consentToken}` : null;
  return NextResponse.json({ handle, consent_url: consentUrl, refs_stored: refsStored });
}
