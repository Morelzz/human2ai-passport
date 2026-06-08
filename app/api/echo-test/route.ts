import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateEcho, isEchoConfigured } from "@/lib/engines/echo";
import { getReferenceSet, uploadReferenceSetFromLocal } from "@/lib/references";
import { uploadPublicImage } from "@/lib/storage";
import { embedProvenancePng } from "@/lib/watermark";

// Rotta di TEST/UTILITY dev-only per ECHO. 404 in produzione. Non è il flusso
// commerciale (quello è /api/generate). Azioni:
//   ?upload-refs=<handle>  -> migra le reference locali su Supabase Storage
//   ?handle=<handle>       -> genera con identity-lock (reference-set)
//   ?full=1&handle=<h>     -> pipeline completa: genera + carica su storage + filigrana
//   (nessun param)         -> text-to-image semplice
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  if (!isEchoConfigured()) {
    return Response.json({ ok: false, error: "ECHO non configurato: manca OPENAI_API_KEY." }, { status: 503 });
  }

  const url = new URL(request.url);

  // — Migrazione reference locali -> Supabase Storage —
  const uploadHandle = url.searchParams.get("upload-refs");
  if (uploadHandle) {
    try {
      const count = await uploadReferenceSetFromLocal(uploadHandle);
      return Response.json({ ok: true, action: "upload-refs", handle: uploadHandle, uploaded: count });
    } catch (e) {
      return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  }

  const handle = url.searchParams.get("handle");
  const full = url.searchParams.get("full") === "1";
  const garmentTest = url.searchParams.get("garment") === "1";

  let references: Buffer[] | undefined;
  let extraPromptNote = "";
  if (handle) {
    references = await getReferenceSet(handle);
    if (references.length === 0) {
      return Response.json({ ok: false, error: `Nessun reference-set per '${handle}' (né storage né cartella locale).` }, { status: 404 });
    }
    // Test "immagine extra": aggiunge una maglietta rossa sintetica come 2ª referenza
    // del cliente, per verificare il percorso outfit (8 identità + 1 extra ≤ 10).
    if (garmentTest) {
      const { default: sharp } = await import("sharp");
      const redShirt = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 200, g: 20, b: 40 } } }).jpeg().toBuffer();
      references = [...references.slice(0, 9), redShirt];
      extraPromptNote = " Wearing a plain bright red t-shirt, exactly as shown in the additional reference image.";
    }
  }

  const prompt =
    (url.searchParams.get("prompt") ??
      (handle
        ? "a realistic photo of the same man shown in the reference images, upper body, neutral studio background, soft natural lighting, looking straight at the camera"
        : "a photorealistic red sports car parked on a city street at golden hour, commercial advertising photography")) + extraPromptNote;

  try {
    const { png, model, mode, refsUsed } = await generateEcho({ prompt, references });

    // Test pipeline completa (come il commerciale): carica su storage + filigrana.
    if (full) {
      const imageUrl = await uploadPublicImage("generations", `echo-test/${Date.now()}.png`, png);
      const fakeCert = "TEST" + Math.abs(png.length).toString(16);
      const stamped = await embedProvenancePng(imageUrl, { certificate: fakeCert, alias: handle ?? "test", verifyUrl: "http://localhost:3000/verify" });
      return Response.json({ ok: true, pipeline: "full", model, mode, refsUsed, image_url: imageUrl, stamped_bytes: stamped.length, cert: fakeCert });
    }

    const dir = resolve(process.cwd(), "scripts");
    mkdirSync(dir, { recursive: true });
    const out = resolve(dir, "echo-test-output.png");
    writeFileSync(out, png);
    return Response.json({ ok: true, engine: "echo", model, mode, refsUsed, bytes: png.length, path: out, handle: handle ?? null, prompt });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
