import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import {
  FACE_MATCH_MAX_DISTANCE,
  findFaceMatch,
  isValidDescriptor,
  loadFaceIndex,
} from "@/lib/face-index";
import { similarityFromDistance } from "@/lib/face-similarity";

export const runtime = "nodejs";

// Fallback di /verify quando la filigrana invisibile NON c'è: il browser
// calcola sul dispositivo il descrittore FaceNet del volto nell'immagine e
// lo manda qui; noi lo confrontiamo con l'indice dei volti del registro.
// Se il volto corrisponde a un avatar, l'immagine è con ogni probabilità una
// generazione NON autorizzata (fatta fuori da Human2AI) → base per /report.
// ONESTÀ: indizio, mai prova. Sotto soglia non si nomina nessuno.

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const descriptor = body?.descriptor;
  if (!isValidDescriptor(descriptor)) {
    return NextResponse.json({ match: false, error: "Descrittore non valido" }, { status: 400 });
  }

  const index = await loadFaceIndex();
  if (!index || index.entries.length === 0) {
    // Indice mai costruito: il fallback semplicemente non è disponibile.
    return NextResponse.json({ match: false, scanned: false, avatars_checked: 0 });
  }

  const best = findFaceMatch(descriptor, index);
  if (!best || best.distance > FACE_MATCH_MAX_DISTANCE) {
    return NextResponse.json({
      match: false,
      scanned: true,
      avatars_checked: best?.avatarsChecked ?? 0,
    });
  }

  // Il match va confermato sul registro LIVE: un avatar uscito dal registro
  // dopo l'ultima costruzione dell'indice non va mai nominato.
  const admin = createServerClient();
  const { data: av } = await admin
    .from("avatars")
    .select("handle, alias, tier, consent_start, revoked_at, verification_status")
    .eq("handle", best.handle)
    .maybeSingle();
  if (!av || !isPublicAvatar(av)) {
    return NextResponse.json({ match: false, scanned: true, avatars_checked: best.avatarsChecked });
  }

  return NextResponse.json({
    match: true,
    scanned: true,
    avatars_checked: best.avatarsChecked,
    handle: av.handle,
    alias: av.alias,
    tier: av.tier,
    status: av.revoked_at ? "REVOCATO" : "ATTIVO",
    consent_start: av.consent_start,
    revoked_at: av.revoked_at,
    similarity: similarityFromDistance(best.distance),
    distance: best.distance,
  });
}
