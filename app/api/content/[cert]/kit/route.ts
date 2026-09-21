import { createServerClient } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";
import { embedProvenancePng } from "@/lib/watermark";
import { kitCampagna, type DatiKit } from "@/lib/kit-campagna";

// KIT CAMPAGNA: uno zip con i quattro tagli pronti a pubblicare, l'originale e
// la liberatoria scritta. Stesse regole del download singolo (../route.ts): il
// certificato da solo non basta, serve la sessione di CHI HA COMPRATO. 404 a
// tutti gli altri, per non dire nemmeno se quel certificato esiste.
export const runtime = "nodejs";
export const maxDuration = 120; // quattro ritagli + filigrana invisibile: secondi, non millisecondi

export async function GET(request: Request, { params }: { params: Promise<{ cert: string }> }) {
  const { cert } = await params;
  if (!cert) return new Response("Not found", { status: 404 });

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response("Not found", { status: 404 });

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("id, image_url, buyer_id, prompt, mode, created_at, identity_score, avatars!generations_avatar_id_fkey(alias, handle)")
    .eq("certificate", cert)
    .maybeSingle();

  if (!gen?.image_url) return new Response("Not found", { status: 404 });
  if (gen.buyer_id !== user.id) return new Response("Not found", { status: 404 });

  // Chi c'e' dentro: le persone della scena di gruppo, o l'unico volto.
  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
  let persone: DatiKit["persone"] = av ? [{ alias: av.alias as string, handle: av.handle as string, somiglianza: (gen.identity_score as number | null) ?? null }] : [];
  const { data: gp } = await admin
    .from("generation_people")
    .select("posizione, identity_score, avatars(alias, handle)")
    .eq("generation_id", gen.id)
    .order("posizione");
  if (gp && gp.length > 1) {
    persone = gp.flatMap((r) => {
      const a = Array.isArray(r.avatars) ? r.avatars[0] : r.avatars;
      return a ? [{ alias: a.alias as string, handle: a.handle as string, somiglianza: (r.identity_score as number | null) ?? null }] : [];
    });
  }

  const origin = new URL(request.url).origin;
  let zip: Buffer;
  try {
    const originale = await embedProvenancePng(gen.image_url, {
      certificate: cert,
      alias: persone.map((p) => p.alias).join(", ") || "Avatar",
      verifyUrl: `${origin}/verify`,
    });
    zip = await kitCampagna(originale, {
      certificato: cert,
      scena: (gen.prompt as string) ?? "",
      quando: (gen.created_at as string) ?? new Date().toISOString(),
      persone,
      verifyUrl: `${origin}/verify`,
    });
  } catch (e) {
    console.error(`[KIT ${cert.slice(0, 12)}] fallito`, e instanceof Error ? e.message : e);
    return new Response("Errore nella preparazione del kit", { status: 502 });
  }

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="semblic-kit-${cert.slice(0, 12)}.zip"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
