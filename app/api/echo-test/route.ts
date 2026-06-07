import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateEcho, isEchoConfigured } from "@/lib/engines/echo";

// Rotta di TEST TEMPORANEA per l'adapter ECHO (gpt-image-2), eseguita DENTRO il
// runtime server di Next (il vero target d'integrazione). Solo sviluppo: 404 in
// produzione. Non fa parte del flusso commerciale (niente consenso/royalty/filigrana):
// serve solo a vedere che ECHO genera. Da rimuovere dopo il wiring definitivo.
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  if (!isEchoConfigured()) {
    return Response.json({ ok: false, error: "ECHO non configurato: manca OPENAI_API_KEY." }, { status: 503 });
  }

  const prompt =
    new URL(request.url).searchParams.get("prompt") ??
    "a photorealistic red sports car parked on a city street at golden hour, commercial advertising photography";

  try {
    const { png, model } = await generateEcho({ prompt });
    const dir = resolve(process.cwd(), "scripts");
    mkdirSync(dir, { recursive: true });
    const out = resolve(dir, "echo-test-output.png");
    writeFileSync(out, png);
    return Response.json({ ok: true, engine: "echo", model, bytes: png.length, path: out, prompt });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
