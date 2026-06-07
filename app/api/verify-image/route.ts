import { createServerClient } from "@/lib/supabase";
import { extractStego } from "@/lib/stegano";
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
    .select("created_at, category, certificate, avatars(handle, alias, tier, consent_start, revoked_at)")
    .eq("certificate", cert)
    .maybeSingle();

  if (!gen) {
    // Marcato Human2AI ma il certificato non è nel registro (raro: dato rimosso).
    return NextResponse.json({ valid: false, marked: true, certificate: cert });
  }

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
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
  });
}
