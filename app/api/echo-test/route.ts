import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateEcho, isEchoConfigured } from "@/lib/engines/echo";
import { getReferenceSet, hasReferenceSet } from "@/lib/references";

// Rotta di TEST TEMPORANEA per l'adapter ECHO (gpt-image-2), eseguita DENTRO il
// runtime server di Next. Solo sviluppo: 404 in produzione. Non fa parte del
// flusso commerciale (niente consenso/royalty/filigrana): serve solo a vedere
// che ECHO genera, e — con ?handle=<avatar> — che l'identity-lock funziona.
// Da rimuovere dopo il wiring definitivo.
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  if (!isEchoConfigured()) {
    return Response.json({ ok: false, error: "ECHO non configurato: manca OPENAI_API_KEY." }, { status: 503 });
  }

  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");

  // Con ?handle=<avatar>: carica il reference-set per l'identity-lock.
  let references: Buffer[] | undefined;
  if (handle) {
    if (!hasReferenceSet(handle)) {
      return Response.json(
        { ok: false, error: `Nessuna sorgente reference configurata per '${handle}' (env REFERENCES_${handle.toUpperCase().replace(/[^A-Z0-9]+/g, "_")} non impostata).` },
        { status: 404 }
      );
    }
    references = await getReferenceSet(handle);
    if (references.length === 0) {
      return Response.json({ ok: false, error: `Cartella reference vuota o illeggibile per '${handle}'.` }, { status: 404 });
    }
  }

  const prompt =
    url.searchParams.get("prompt") ??
    (handle
      ? "a realistic portrait photo of the same man shown in the reference images, head and shoulders, neutral studio background, soft natural lighting, looking straight at the camera"
      : "a photorealistic red sports car parked on a city street at golden hour, commercial advertising photography");

  try {
    const { png, model, mode, refsUsed } = await generateEcho({ prompt, references });
    const dir = resolve(process.cwd(), "scripts");
    mkdirSync(dir, { recursive: true });
    const out = resolve(dir, "echo-test-output.png");
    writeFileSync(out, png);
    return Response.json({ ok: true, engine: "echo", model, mode, refsUsed, bytes: png.length, path: out, handle: handle ?? null, prompt });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
