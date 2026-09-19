import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/storage";
import { grantVolt } from "@/lib/volt";
import { statoVideo, type StatoVideo } from "@/lib/engines/anima";
import { dividiRoyalty } from "@/lib/gruppo-prezzi";

export const runtime = "nodejs";
export const maxDuration = 60;

// Stato di un video Anima. La pagina interroga questa rotta; quando il motore
// ha finito, UNA sola richiesta (stato running -> finishing, aggiornamento
// condizionato) scarica il video, lo copia nel nostro storage (il motore lo
// tiene solo 7 giorni), lo certifica e accredita la persona. Errore o rifiuto
// del motore: VOLT restituiti.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const admin = createServerClient();
  const { data: a } = await admin.from("animations").select("*").eq("id", id).maybeSingle();
  if (!a || a.buyer_id !== user.id) return NextResponse.json({ error: "Video inesistente" }, { status: 404 });

  const esito = () => ({ status: a.status, video_url: a.video_url ?? undefined, certificate: a.certificate ?? undefined, error: a.error ?? undefined, seconds: a.seconds, gross_cents: a.gross_cents, royalty_cents: a.royalty_cents });
  if (a.status === "done" || a.status === "error" || a.status === "finishing") return NextResponse.json(esito());

  if (!a.provider_request_id) return NextResponse.json({ status: "running", fase: "coda" });
  let s: StatoVideo;
  try {
    s = await statoVideo(String(a.provider_request_id));
  } catch {
    return NextResponse.json({ status: "running", fase: "lavoro" }); // rete: si riprova al prossimo giro
  }
  if (s.stato === "coda" || s.stato === "lavoro") return NextResponse.json({ status: "running", fase: s.stato });

  if (s.stato === "errore") {
    const messaggio = s.motivo === "rifiutato"
      ? "Il motore ha rifiutato questo movimento per le sue regole sui contenuti."
      : "Il video non è riuscito.";
    const { data: preso } = await admin.from("animations").update({ status: "error", error: messaggio, finished_at: new Date().toISOString() }).eq("id", id).eq("status", "running").select("id").maybeSingle();
    if (preso) await grantVolt(user.id, a.gross_cents, "refund", `anima:${id}`);
    return NextResponse.json({ status: "error", error: messaggio, volt_refunded: preso ? a.gross_cents : undefined });
  }

  if (s.stato !== "fatto") return NextResponse.json({ status: "running", fase: "lavoro" });
  const sorgente = s.url;

  // Fatto: solo chi "prende" il passaggio running -> finishing copia e accredita.
  const { data: preso } = await admin.from("animations").update({ status: "finishing" }).eq("id", id).eq("status", "running").select("id").maybeSingle();
  if (!preso) return NextResponse.json({ status: "running", fase: "lavoro" });
  try {
    const video = Buffer.from(await (await fetch(sorgente)).arrayBuffer());
    if (video.length < 10_000) throw new Error("video vuoto");
    const url = await uploadPublicImage("generations", `${a.avatar_id}/video/${id}.mp4`, video, "video/mp4");
    const certificate = crypto.createHash("sha256").update(`${a.avatar_id}|${id}|anima|${a.movement}|${new Date().toISOString().slice(0, 10)}`).digest("hex");

    // Scena di gruppo: la parte delle persone si divide fra tutte, come per la foto.
    const { data: nellaFoto } = await admin.from("generation_people").select("avatar_id, posizione").eq("generation_id", a.source_generation_id).order("posizione");
    const chi: string[] = nellaFoto && nellaFoto.length > 1 ? nellaFoto.map((r) => r.avatar_id as string) : [a.avatar_id];
    const quote = dividiRoyalty(a.royalty_cents, chi.length);
    for (let i = 0; i < chi.length; i++) {
      const { data: av } = await admin.from("avatars").select("usage_count, royalty_accrued_cents").eq("id", chi[i]).maybeSingle();
      await admin.from("avatars").update({
        usage_count: (av?.usage_count ?? 0) + 1,
        royalty_accrued_cents: (av?.royalty_accrued_cents ?? 0) + quote[i],
      }).eq("id", chi[i]);
    }

    await admin.from("animations").update({ status: "done", video_url: url, certificate, finished_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ status: "done", video_url: url, certificate, seconds: a.seconds, gross_cents: a.gross_cents, royalty_cents: a.royalty_cents });
  } catch (e) {
    // La copia non e' riuscita: si torna a running, il prossimo giro riprova.
    console.error("[ANIMA] copia fallita", e instanceof Error ? e.message : e);
    await admin.from("animations").update({ status: "running" }).eq("id", id).eq("status", "finishing");
    return NextResponse.json({ status: "running", fase: "lavoro" });
  }
}
