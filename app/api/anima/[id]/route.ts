import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { grantVolt } from "@/lib/volt";
import { statoVideo, type StatoVideo } from "@/lib/engines/anima";

export const runtime = "nodejs";
export const maxDuration = 30;

// Stato di un video Anima per la pagina. La CONSEGNA non avviene qui: la fa il
// worker (lib/anima-job), che controlla ogni fotogramma prima di rilasciare il
// video. Qui si legge lo stato e, se il motore ha gia' fallito, si restituiscono
// subito i VOLT (aggiornamento condizionato: mai due rimborsi).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const admin = createServerClient();
  const { data: a } = await admin.from("animations").select("*").eq("id", id).maybeSingle();
  if (!a || a.buyer_id !== user.id) return NextResponse.json({ error: "Video inesistente" }, { status: 404 });

  if (a.status === "done") {
    return NextResponse.json({
      status: "done",
      video_url: a.video_url ?? undefined,
      certificate: a.certificate ?? undefined,
      seconds: a.seconds,
      gross_cents: a.gross_cents,
      royalty_cents: a.royalty_cents,
      identity_score: typeof a.identity_score === "number" ? a.identity_score : undefined,
      frames_checked: typeof a.frames_checked === "number" ? a.frames_checked : undefined,
    });
  }
  if (a.status === "error") return NextResponse.json({ status: "error", error: a.error ?? undefined });
  if (a.status === "finishing") return NextResponse.json({ status: "running", fase: "controllo" });
  if (!a.provider_request_id) return NextResponse.json({ status: "running", fase: "coda" });

  let s: StatoVideo;
  try {
    s = await statoVideo(String(a.provider_request_id));
  } catch {
    return NextResponse.json({ status: "running", fase: "lavoro" }); // rete: si riprova al prossimo giro
  }
  if (s.stato === "coda" || s.stato === "lavoro") return NextResponse.json({ status: "running", fase: s.stato });
  // Pronto dal motore: ora tocca al controllo del worker.
  if (s.stato === "fatto") return NextResponse.json({ status: "running", fase: "controllo" });
  if (s.stato !== "errore") return NextResponse.json({ status: "running", fase: "lavoro" });

  const messaggio = s.motivo === "rifiutato"
    ? "Il motore ha rifiutato questo movimento per le sue regole sui contenuti."
    : "Il video non è riuscito.";
  const { data: preso } = await admin.from("animations").update({ status: "error", error: messaggio, finished_at: new Date().toISOString() }).eq("id", id).eq("status", "running").select("id").maybeSingle();
  if (preso) await grantVolt(user.id, a.gross_cents, "refund", `anima:${id}`);
  return NextResponse.json({ status: "error", error: messaggio, volt_refunded: preso ? a.gross_cents : undefined });
}
