import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";
import { classifyRecheck, nextTakedownStatus, type TakedownEvent } from "@/lib/ward/takedown";
import { getAction, matchOwner, updateActionStatus } from "@/lib/ward/takedown-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ward/takedown/status { actionId, event } — tracking leggero.
//  event 'send'    -> l'utente dichiara di aver inviato la richiesta (-> sent).
//  event 'recheck' -> ricontrollo leggero dell'URL della copia (-> removed | online).
// Nessun invio: solo lo stato cambia.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const allowed = await allowRequest(`ward-takedown-status:${user.id}`, 60, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Troppe richieste, riprova piu' tardi" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const actionId = String(body?.actionId ?? "").trim();
  const event = String(body?.event ?? "").trim();
  if (!actionId || (event !== "send" && event !== "recheck")) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const action = await getAction(actionId);
  if (!action) return NextResponse.json({ error: "Azione non trovata" }, { status: 404 });

  // Ownership via match -> generation buyer.
  const m = await matchOwner(action.scanMatchId);
  if (!m || m.buyerId !== user.id) return NextResponse.json({ error: "Azione non trovata" }, { status: 404 });

  let evt: TakedownEvent;
  if (event === "send") {
    evt = "send";
  } else {
    // Ricontrollo best-effort dell'URL: HTTP status -> gone/online. Timeout corto,
    // niente dato salvato. Un errore di rete = trattiamo come irraggiungibile? No:
    // restiamo prudenti (online) per non dichiarare rimosso a vuoto; solo un 404/410
    // certo o una risposta assente dichiara 'gone'.
    const target = m.pageUrl || m.sourceUrl;
    let httpStatus: number | null = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(target, { method: "GET", signal: ctrl.signal, redirect: "follow" });
      clearTimeout(t);
      httpStatus = res.status;
    } catch {
      // Irraggiungibile: ambiguo. Per non dichiarare 'gone' su un semplice timeout,
      // lo trattiamo come online (prudente). Solo 404/410 espliciti = removed.
      httpStatus = 200;
    }
    evt = classifyRecheck(httpStatus) === "gone" ? "recheck-gone" : "recheck-online";
  }

  let status;
  try {
    status = nextTakedownStatus(action.status, evt);
  } catch {
    return NextResponse.json({ error: "Transizione non valida", status: action.status }, { status: 409 });
  }

  await updateActionStatus(actionId, status);
  return NextResponse.json({ ok: true, status });
}
