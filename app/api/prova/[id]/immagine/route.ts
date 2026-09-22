import { createServerClient } from "@/lib/supabase";
import { watermarkBuffer } from "@/lib/watermark";
import { accountProva, provaAttiva } from "@/lib/prova-gratis";

// L'immagine della prova, SEMPRE con la filigrana in faccia e a 720 pixel.
// L'URL pulito non esce da qui: la prova e' un provino, la foto pulita si
// scarica dall'account. Solo i lavori dell'account di servizio.

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!provaAttiva()) return new Response("Not found", { status: 404 });

  const admin = createServerClient();
  const { data: conto } = await admin.from("profiles").select("id").eq("email", accountProva()).maybeSingle();
  if (!conto?.id) return new Response("Not found", { status: 404 });

  const { data: job } = await admin
    .from("generation_jobs")
    .select("image_url, status")
    .eq("id", id)
    .eq("buyer_id", conto.id)
    .maybeSingle();
  if (!job?.image_url || job.status !== "done") return new Response("Not found", { status: 404 });

  let out: Buffer;
  try {
    out = await watermarkBuffer(job.image_url, 720);
  } catch {
    return new Response("Errore immagine", { status: 502 });
  }

  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "image/jpeg",
      // La prova e' pubblica e non cambia mai: la CDN puo' tenersela.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
