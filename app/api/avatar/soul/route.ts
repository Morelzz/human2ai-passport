import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { createSoulFromImages, SoulPhoto } from "@/lib/higgsfield";

// Attiva il Soul di un avatar: il creatore verificato carica le sue foto reali,
// noi addestriamo il Soul sul motore e salviamo soul_ref. Costo (~20 crediti) a
// carico della piattaforma. Operazione lunga (upload + training con polling).
export const maxDuration = 300;

const MIN_PHOTOS = 8;
const MAX_PHOTOS = 20;

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  // Autorizzazione: creatore verificato (KYC) — è il filtro anti-spam.
  const { data: profile } = await auth
    .from("profiles")
    .select("role, kyc_status")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "seller") {
    return NextResponse.json({ error: "Solo gli account Creatore possono attivare un Soul" }, { status: 403 });
  }
  if (profile?.kyc_status !== "approved") {
    return NextResponse.json({ error: "Devi prima verificare la tua identità (KYC)" }, { status: 403 });
  }

  const admin = createServerClient();
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, alias, soul_ref")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Non hai ancora un avatar nel registro" }, { status: 404 });
  if (avatar.soul_ref) return NextResponse.json({ error: "Il Soul è già attivo per questo avatar" }, { status: 409 });

  // Foto caricate (multipart/form-data, campo "photos").
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload non valido" }, { status: 400 });
  }
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length < MIN_PHOTOS) {
    return NextResponse.json({ error: `Carica almeno ${MIN_PHOTOS} foto del volto` }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Massimo ${MAX_PHOTOS} foto` }, { status: 400 });
  }

  const photos: SoulPhoto[] = [];
  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      return NextResponse.json({ error: "Sono ammesse solo immagini" }, { status: 400 });
    }
    const buffer = Buffer.from(await f.arrayBuffer());
    const format = f.type.includes("png") ? "png" : f.type.includes("webp") ? "webp" : "jpeg";
    photos.push({ buffer, format });
  }

  // Addestra il Soul (operazione lunga + costosa).
  let soul;
  try {
    soul = await createSoulFromImages(`${avatar.alias} Soul`, photos);
  } catch {
    return NextResponse.json({ error: "Creazione del Soul non riuscita sul motore" }, { status: 502 });
  }
  if (!soul) {
    return NextResponse.json({ error: "Il Soul non è stato completato (riprova con foto più nitide)" }, { status: 502 });
  }

  // Collega il Soul all'avatar: ora è generabile.
  const { error: updErr } = await admin.from("avatars").update({ soul_ref: soul.id }).eq("id", avatar.id);
  if (updErr) {
    return NextResponse.json({ error: "Soul creato ma collegamento non riuscito" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, soul_id: soul.id });
}
