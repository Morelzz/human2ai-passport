import { createServerClient } from "@/lib/supabase";
import { embedProvenancePng } from "@/lib/watermark";

// Download del contenuto commerciale con la PROVENIENZA impressa nei metadati.
// Chi ha il certificato (il compratore) ottiene il file con la sua tracciabilità.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cert: string }> }
) {
  const { cert } = await params;
  if (!cert) return new Response("Not found", { status: 404 });

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("image_url, avatars(alias)")
    .eq("certificate", cert)
    .maybeSingle();

  if (!gen?.image_url) return new Response("Not found", { status: 404 });

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
  const origin = new URL(request.url).origin;

  let out: Buffer;
  try {
    out = await embedProvenancePng(gen.image_url, {
      certificate: cert,
      alias: av?.alias ?? "—",
      verifyUrl: `${origin}/verify`,
    });
  } catch {
    return new Response("Errore immagine", { status: 502 });
  }

  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="human2ai-${cert.slice(0, 12)}.png"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
