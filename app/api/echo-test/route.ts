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

  let references: Buffer[] | undefined;
  if (handle) {
    references = await getReferenceSet(handle);
    if (references.length === 0) {
      return Response.json({ ok: false, error: `Nessun reference-set per '${handle}' (né storage né cartella locale).` }, { status: 404 });
    }
  }

  const prompt =
    url.searchParams.get("prompt") ??
    (handle
      ? "a realistic portrait photo of the same man shown in the reference images, head and shoulders, neutral studio background, soft natural lighting, looking straight at the camera"
      : "a photorealistic red sports car parked on a city street at golden hour, commercial advertising photography");

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
