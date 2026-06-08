import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateEcho, isEchoConfigured } from "@/lib/engines/echo";
import { getReferenceSet, uploadReferenceSetFromLocal } from "@/lib/references";
import { uploadPublicImage } from "@/lib/storage";
import { embedProvenancePng } from "@/lib/watermark";
import { embedStego, extractStego } from "@/lib/stegano";

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

  // — Test filigrana invisibile (roundtrip + invisibilità), senza chiamate API —
  if (url.searchParams.get("stego") === "1") {
    try {
      const dir = resolve(process.cwd(), "scripts");
      const src = readFileSync(resolve(dir, "echo-prod-output.png"));
      const cert = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
      const stamped = await embedStego(src, cert);
      const extracted = await extractStego(stamped);
      writeFileSync(resolve(dir, "stego-test-output.png"), stamped);
      return Response.json({ ok: true, action: "stego", match: extracted === cert, extracted: extracted?.slice(0, 16) + "…", srcBytes: src.length, stampedBytes: stamped.length });
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

  const size = (url.searchParams.get("size") as Parameters<typeof generateEcho>[0]["size"]) ?? undefined;
  const quality = (url.searchParams.get("quality") as Parameters<typeof generateEcho>[0]["quality"]) ?? undefined;

  try {
    const t0 = Date.now();
    const { png, model, mode, refsUsed } = await generateEcho({ prompt, references, size, quality });
    const ms = Date.now() - t0;

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
    return Response.json({ ok: true, engine: "echo", model, mode, refsUsed, size, quality, ms, bytes: png.length, path: out, handle: handle ?? null });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
