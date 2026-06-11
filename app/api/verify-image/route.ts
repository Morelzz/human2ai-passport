import { createServerClient } from "@/lib/supabase";
import { extractStego } from "@/lib/stegano";
import { galleryFromRow } from "@/lib/sample-galleries";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Verifica "filtro": data un'immagine, estrae la filigrana invisibile (certificato
// nascosto nei pixel) e conferma se è un contenuto Human2AI, di chi, e lo stato consenso.
export async function POST(req: Request) {
  // Preferito: multipart/form-data (file binario, niente bloat base64).
  // Fallback: JSON { image: dataURL } per retrocompatibilità.
  let buf: Buffer;
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("image");
    if (!(file instanceof File)) return NextResponse.json({ valid: false, error: "Nessuna immagine" }, { status: 400 });
    buf = Buffer.from(await file.arrayBuffer());
  } else {
    const body = await req.json().catch(() => null);
    const image = typeof body?.image === "string" ? body.image : "";
    if (!image) return NextResponse.json({ valid: false, error: "Nessuna immagine" }, { status: 400 });
    const b64 = image.includes(",") ? image.split(",")[1] : image;
    try { buf = Buffer.from(b64, "base64"); } catch { return NextResponse.json({ valid: false, marked: false }); }
  }
  if (!buf.length) return NextResponse.json({ valid: false, marked: false });

  const cert = await extractStego(buf);
  if (!cert) return NextResponse.json({ valid: false, marked: false });

  const supabase = createServerClient();
  const { data: gen } = await supabase
    .from("generations")
    .select("created_at, category, certificate, avatars(id, handle, alias, tier, consent_start, revoked_at, approved_categories, excluded_categories)")
    .eq("certificate", cert)
    .maybeSingle();

  if (!gen) {
    // Marcato Human2AI ma il certificato non è nel registro (raro: dato rimosso).
    return NextResponse.json({ valid: false, marked: true, certificate: cert });
  }

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;

  // Catena del consenso: la timeline degli eventi rende il verdetto un atto
  // ("ecco cosa questa persona ha autorizzato e quando"), non un sì/no.
  // Best-effort: senza eventi la card usa consent_start/revoked_at.
  let events: Array<{ event_type: string; detail: string | null; occurred_at: string }> = [];
  if (av?.id) {
    const { data: ev } = await supabase
      .from("consent_events")
      .select("event_type, detail, occurred_at")
      .eq("avatar_id", av.id)
      .order("occurred_at", { ascending: false })
      .limit(20);
    // I 20 più RECENTI (una revoca di ieri non deve mai sparire per
    // troncamento), ri-ordinati in cronologia ascendente per la card.
    events = (ev ?? []).reverse();
  }

  return NextResponse.json({
    valid: true,
    marked: true,
    type: "content",
    certificate: gen.certificate,
    alias: av?.alias ?? null,
    handle: av?.handle ?? null,
    tier: av?.tier ?? null,
    status: av?.revoked_at ? "REVOCATO" : "ATTIVO",
    consent_start: av?.consent_start ?? null,
    revoked_at: av?.revoked_at ?? null,
    generated_at: gen.created_at,
    category: gen.category ?? null,
    // Per il check "categoria d'uso coerente col consenso ATTUALE" e la
    // correlazione visiva col ritratto pubblico dell'avatar.
    approved_categories: av?.approved_categories ?? null,
    excluded_categories: av?.excluded_categories ?? null,
    // NB: gallery_urls vive nella migrazione avatar_public_profile (non ancora
    // applicata): galleryFromRow usa la mappa fallback per handle.
    has_portrait: av?.handle ? galleryFromRow(av.handle, undefined).length > 0 : false,
    events,
  });
}
