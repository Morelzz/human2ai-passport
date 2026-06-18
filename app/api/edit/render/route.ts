import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { coerceEditState } from "@/lib/editor/types";
import { renderEditedPng } from "@/lib/editor/render-pixels";
import { embedStego } from "@/lib/stegano";

export const runtime = "nodejs";
// La resa (upscale + pipeline sui pixel + provenienza) puo durare alcuni secondi.
export const maxDuration = 60;

// Rapporti d'aspetto per piattaforma (larghezza/altezza).
const FORMAT_AR: Record<string, number> = {
  ig: 4 / 5, // 0.8
  story: 9 / 16, // 0.5625
  li: 1.91, // 1.91:1
  ecom: 1, // 1:1
};

// ──────────────────────────────────────────────────────────────────────────
// /api/edit/render — scarica l'immagine MODIFICATA dall'editor. Owner check
// come /api/content. Applica edit_state (resa fedele all'anteprima),
// l'eventuale upscale e il formato, poi imprime la provenienza (certificato
// nascosto nei pixel + EXIF). Persiste best-effort edit_state/upscale/format.
// ──────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return new Response("Not found", { status: 404 });

  const body = await request.json().catch(() => null);
  const cert = String(body?.cert ?? "").trim();
  if (!cert) return new Response("Not found", { status: 404 });

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("id, buyer_id, image_url, avatars(alias)")
    .eq("certificate", cert)
    .maybeSingle();
  if (!gen?.image_url || gen.buyer_id !== user.id) return new Response("Not found", { status: 404 });

  const state = coerceEditState(body?.editState);
  const upscale = body?.upscale === "2k" || body?.upscale === "4k" ? body.upscale : null;
  const format = typeof body?.format === "string" && body.format in FORMAT_AR ? (body.format as string) : null;
  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
  const alias = av?.alias ?? "—";

  try {
    // 1. immagine pulita
    const resp = await fetch(gen.image_url);
    if (!resp.ok) throw new Error("download immagine");
    let buf: Buffer = Buffer.from(await resp.arrayBuffer());

    // 2. upscale (solo ingrandimento, mantiene l'aspetto)
    if (upscale) {
      const target = upscale === "4k" ? 3840 : 2048;
      const meta = await sharp(buf).metadata();
      const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
      if (longEdge > 0 && longEdge < target) {
        buf = await sharp(buf).resize(target, target, { fit: "inside" }).png().toBuffer();
      }
    }

    // 3. resa delle modifiche (fedele all'anteprima)
    let edited = await renderEditedPng(buf, state);

    // 4. crop al formato piattaforma (center crop sull'aspetto)
    if (format) {
      const ar = FORMAT_AR[format];
      const m = await sharp(edited).metadata();
      const ew = m.width ?? 0;
      const eh = m.height ?? 0;
      if (ew > 0 && eh > 0) {
        let cw: number;
        let ch: number;
        if (ew / eh > ar) {
          ch = eh;
          cw = Math.round(eh * ar);
        } else {
          cw = ew;
          ch = Math.round(ew / ar);
        }
        edited = await sharp(edited).resize({ width: cw, height: ch, fit: "cover", position: "centre" }).png().toBuffer();
      }
    }

    // 5. provenienza: certificato nascosto nei pixel + metadati EXIF.
    const origin = new URL(request.url).origin;
    const desc = `Generato via Semblic con consenso. Avatar: ${alias}. Certificato: ${cert}. Verifica: ${origin}/verify`;
    const stego = await embedStego(edited, cert);
    let out: Buffer;
    try {
      out = await sharp(stego)
        .withExif({
          IFD0: {
            ImageDescription: desc,
            Copyright: "Semblic: contenuto certificato, persona reale consenziente",
            Artist: alias,
            Software: "Semblic",
          },
        })
        .png()
        .toBuffer();
    } catch {
      out = stego;
    }

    // 6. persistenza best-effort dello stato editor + scelte export.
    await admin
      .from("generations")
      .update({ edit_state: state, upscale, export_format: format })
      .eq("id", gen.id);

    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="semblic-edit-${cert.slice(0, 12)}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Errore nella resa", { status: 502 });
  }
}
