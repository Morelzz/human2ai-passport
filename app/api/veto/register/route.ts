import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { appendProtectedFaces } from "@/lib/protected-index";
import { isValidDescriptor } from "@/lib/face-index";

export const runtime = "nodejs";

// Fase 2.4 / 2.6 (modulo VETO): registrazione INVERSA. Una persona verificata
// chiede di NON essere generata ("Diritto all'Oblio Generativo"). Creiamo un
// avatar protection_only (escluso da ogni superficie pubblica, tutte le categorie
// bloccate, gate input attivo, vedi 2.1/2.2) e appendiamo il suo faceprint
// difensivo all'indice protetti. La protezione e' ATTIVA SUBITO (protect-first:
// proteggere ha priorita' sul review). I documenti restano per audit/contestazioni.
// Consenso Art.9 esplicito e obbligatorio; il dato biometrico ha scopo ESCLUSIVO
// di protezione e l'interessato puo' chiederne la cancellazione totale (2.6).

function ext(file: File): string {
  const m = file.type.split("/")[1];
  if (m) return m.replace("jpeg", "jpg");
  const n = file.name.split(".").pop();
  return n ? n.toLowerCase() : "bin";
}

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere per proteggere il tuo volto" }, { status: 401 });
  const uid = user.id;

  const admin = createServerClient();
  // Se l'identita e' gia' verificata via KYC (flusso protetto Ward), il documento
  // e il selfie non sono richiesti: basta la cattura del volto (spec Passo 3b).
  const { data: prof } = await admin.from("profiles").select("kyc_status").eq("id", uid).maybeSingle();
  const kycApproved = prof?.kyc_status === "approved";

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  // Consenso Art.9 ESPLICITO e obbligatorio (dato biometrico, scopo difensivo).
  if (form.get("art9_consent") !== "true") {
    return NextResponse.json({ error: "Serve il consenso esplicito al trattamento del dato biometrico a soli fini di protezione." }, { status: 400 });
  }

  // Faceprint difensivo: i descrittori si calcolano NEL BROWSER (qui arrivano solo
  // i 128 float, mai i pixel per l'indice). Almeno uno valido o non c'e' nulla da proteggere.
  let descriptors: number[][] = [];
  try {
    const raw = JSON.parse(String(form.get("descriptors") ?? "[]"));
    if (Array.isArray(raw)) descriptors = raw.filter(isValidDescriptor);
  } catch { /* nessun descrittore valido */ }
  if (descriptors.length === 0) {
    return NextResponse.json({ error: "Non sono riuscito a leggere il tuo volto dalle foto. Carica foto piu' nitide e frontali." }, { status: 400 });
  }

  const docFront = form.get("document_front");
  const selfie = form.get("selfie");
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);
  if (!kycApproved && (!(docFront instanceof File) || !(selfie instanceof File))) {
    return NextResponse.json({ error: "Servono il documento (fronte) e un selfie per confermare che il volto sia tuo." }, { status: 400 });
  }

  // Gate identità: se la persona è verificata col KYC, il volto che protegge deve
  // essere il SUO (quello verificato). Confronto server-side sulle foto se
  // disponibili, altrimenti sui descrittori inviati; banda "weak" = blocco.
  // Senza riferimento (no KYC / link scaduto / niente volto) niente blocco: la
  // protezione resta protect-first.
  if (kycApproved) {
    const { checkBestFaceAgainstIdentity, checkDescriptorsAgainstIdentity } = await import("@/lib/kyc/identity-face");
    let idCheck;
    if (photos.length > 0) {
      const imgs: Uint8Array[] = [];
      for (const p of photos.slice(0, 5)) imgs.push(new Uint8Array(await p.arrayBuffer()));
      idCheck = await checkBestFaceAgainstIdentity(uid, imgs);
    } else {
      idCheck = await checkDescriptorsAgainstIdentity(uid, descriptors);
    }
    if (idCheck && idCheck.band === "weak") {
      return NextResponse.json(
        { error: "Il volto delle foto non corrisponde al documento con cui ti sei verificato. Puoi proteggere solo il tuo volto." },
        { status: 403 },
      );
    }
  }

  // 1:1: chi concede il proprio volto nel registro non puo' al tempo stesso
  // proteggerlo (e viceversa). Se esiste gia' una protezione, e' una ri-registrazione.
  const { data: existing } = await admin
    .from("avatars")
    .select("id, handle, protection_only")
    .eq("owner_id", uid)
    .maybeSingle();
  if (existing && !existing.protection_only) {
    return NextResponse.json({ error: "Hai gia' un avatar nel registro: non puoi proteggere e concedere lo stesso volto. Scrivici per assistenza." }, { status: 409 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let avatarId = existing?.id ?? null;
  let handle = existing?.handle ?? `protected-${crypto.randomUUID().slice(0, 8)}`;

  if (existing?.protection_only) {
    // Ri-registrazione: riattiva e aggiorna la data; il faceprint si ri-appende sotto.
    await admin.from("avatars").update({ consent_start: today, revoked_at: null }).eq("id", existing.id);
  } else {
    const tokenHash = crypto.createHash("sha256").update(`${handle}|${crypto.randomUUID()}`).digest("hex");
    const { data: created, error: insErr } = await admin
      .from("avatars")
      .insert({
        handle,
        alias: "Volto protetto",
        tier: "SOUL",
        protection_only: true,
        commercial_consent: false, // sola protezione: nessun uso commerciale (gate via protection_only)
        consent_start: today,
        token_hash: tokenHash,
        owner_id: uid,
        is_demo: false,
        verification_status: "approved",
      })
      .select("id, handle")
      .single();
    if (insErr || !created) return NextResponse.json({ error: `Registrazione fallita: ${insErr?.message ?? "errore"}` }, { status: 500 });
    avatarId = created.id;
    handle = created.handle;
  }

  // Faceprint difensivo nell'indice protetti (append, mai travolto dal rebuild admin).
  const indexed = await appendProtectedFaces(handle, descriptors, "veto").catch(() => 0);

  // Documenti per audit/contestazioni (bucket privato documents, sotto /veto/).
  // Best-effort: la protezione e' GIA' attiva (avatar + indice), l'audit non la blocca.
  async function up(file: File, name: string) {
    const buf = Buffer.from(await file.arrayBuffer());
    await admin.storage
      .from("documents")
      .upload(`${uid}/veto/${name}.${ext(file)}`, buf, { contentType: file.type || "application/octet-stream", upsert: true })
      .catch(() => {});
  }
  try {
    if (docFront instanceof File) await up(docFront, "document-front");
    if (selfie instanceof File) await up(selfie, "selfie");
    for (let i = 0; i < photos.length; i++) await up(photos[i], `photo-${i + 1}`);
    const fm = form.get("face_match");
    if (typeof fm === "string" && fm.length > 0 && fm.length < 4000) {
      await admin.storage.from("documents").upload(`${uid}/veto/face-match.json`, Buffer.from(fm), { contentType: "application/json", upsert: true }).catch(() => {});
    }
  } catch { /* audit best-effort */ }

  // Timeline del consenso (Art.9 difensivo).
  if (avatarId) {
    // Timeline best-effort: l'eventuale errore resta nel risultato, lo ignoriamo.
    await admin.from("consent_events").insert({
      avatar_id: avatarId,
      event_type: "GRANTED",
      detail: "Registrazione protezione (VETO): consenso Art.9 a soli fini difensivi, faceprint protetto",
      occurred_at: today,
    });
  }

  return NextResponse.json({ ok: true, indexed });
}
