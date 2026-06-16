import sharp from "sharp";
import { embedStego, extractStego } from "@/lib/stegano";
import { extractCertFromRGBA } from "@/lib/stegano-core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Banco di prova DEV-ONLY (404 in produzione) della filigrana invisibile.
// Prova le DUE strade di estrazione su un PNG opaco sintetico (= come un
// contenuto reale: niente alpha<255, niente profilo ICC):
//   serverMatch = lib/stegano.extractStego (sharp)               → path server
//   coreMatch   = lib/stegano-core.extractCertFromRGBA su raw RGBA → path "equivalente-canvas"
//                 (il raw di sharp coincide con l'ImageData del browser per i PNG opachi)
//   negativeOk  = un PNG PULITO non deve dare falsi positivi
// Così un singolo giro prova che il refactor non ha rotto il server E che la
// lettura on-device (browser) estrae lo stesso certificato.
export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  try {
    const cert = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const base = await sharp({
      create: { width: 240, height: 240, channels: 3, background: { r: 40, g: 60, b: 90 } },
    }).png().toBuffer();

    const stamped = await embedStego(base, cert);

    // (a) path server (sharp).
    const serverExtract = await extractStego(stamped);

    // (b) path "equivalente-canvas": raw RGBA come lo darebbe getImageData.
    const marked = await sharp(stamped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const coreExtract = extractCertFromRGBA(marked.data, marked.info.width * marked.info.height);

    // (c) negativo: PNG pulito → nessuna filigrana.
    const clean = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleanExtract = extractCertFromRGBA(clean.data, clean.info.width * clean.info.height);

    return NextResponse.json({
      ok: true,
      serverMatch: serverExtract === cert,
      coreMatch: coreExtract === cert,
      negativeOk: cleanExtract === null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
