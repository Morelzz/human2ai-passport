import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// KYC reale (step 1 — raccolta evidenze): carica documento + selfie + foto del volto
// nello Storage privato 'documents', e mette il profilo in 'pending' (revisione nostra).
// Il face-match automatico documento↔selfie↔foto (AWS Rekognition) sarà il passo 2.
function ext(file: File): string {
  const m = file.type.split("/")[1];
  if (m) return m.replace("jpeg", "jpg");
  const n = file.name.split(".").pop();
  return n ? n.toLowerCase() : "bin";
}

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const document = form.get("document");
  const selfie = form.get("selfie");
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);

  if (!(document instanceof File) || !(selfie instanceof File)) {
    return NextResponse.json({ error: "Servono documento e selfie" }, { status: 400 });
  }
  if (photos.length < 1) {
    return NextResponse.json({ error: "Carica almeno una foto del volto" }, { status: 400 });
  }

  const admin = createServerClient();
  const base = `${user.id}`;

  async function up(file: File, name: string) {
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage
      .from("documents")
      .upload(`${base}/${name}.${ext(file)}`, buf, { contentType: file.type || "application/octet-stream", upsert: true });
    if (error) throw new Error(error.message);
  }

  try {
    await up(document, "document");
    await up(selfie, "selfie");
    for (let i = 0; i < photos.length; i++) await up(photos[i], `photo-${i + 1}`);

    // Pre-screening face-match calcolato sul dispositivo (best-effort).
    // Salvato accanto ai documenti: la coda operatori lo mostra come AIUTO
    // alla decisione (essendo client-side non è una prova).
    const rawMatch = form.get("face_match");
    if (typeof rawMatch === "string" && rawMatch.length > 0 && rawMatch.length < 4000) {
      try {
        const parsed = JSON.parse(rawMatch);
        await admin.storage
          .from("documents")
          .upload(`${base}/face-match.json`, Buffer.from(JSON.stringify(parsed)), { contentType: "application/json", upsert: true });
      } catch { /* json non valido: si ignora, la verifica resta manuale */ }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore upload";
    // Aiuto chiaro se manca il bucket.
    const hint = /bucket/i.test(msg) ? " — crea il bucket privato 'documents' in Supabase → Storage." : "";
    return NextResponse.json({ error: `Upload fallito: ${msg}${hint}` }, { status: 502 });
  }

  const { error: upErr } = await admin.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: "pending", count: photos.length });
}
