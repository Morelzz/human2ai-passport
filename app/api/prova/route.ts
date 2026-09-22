import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { isEchoConfigured } from "@/lib/engines/echo";
import { getReferenceSet } from "@/lib/references";
import { identityPromptFor } from "@/lib/echo-job";
import { splitEcho } from "@/lib/wallet";
import { spendVolt, grantVolt } from "@/lib/volt";
import { allowRequestStrict, ipFrom } from "@/lib/rate-limit";
import { getPublicAvatars } from "@/lib/registry";
import {
  MISURA_PROVA, QUALITA_PROVA, accountProva, provaAttiva, scenaProva, tettoProveGiorno, voltiPerLaProva,
} from "@/lib/prova-gratis";

// ──────────────────────────────────────────────────────────────────────────
// LA PROVA GRATIS. Uno sconosciuto sceglie un volto e una scena, e vede.
// Tre reti prima di spendere un centesimo, nell'ordine:
//  1. l'interruttore (PROVA_GRATIS): spento, qui non c'e' niente;
//  2. una prova per IP ogni 24 ore, e un tetto per tutti; se il conteggio non
//     si puo' fare si dice di NO (allowRequestStrict): un guasto non deve
//     diventare un rubinetto aperto sui nostri soldi;
//  3. il saldo VOLT dell'account di servizio: e' quello il budget vero.
// La scena arriva da una lista chiusa (lib/prova-gratis): nessuno scrive quello
// che vuole su un volto vero senza nemmeno un account.
// ──────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!provaAttiva()) {
    return NextResponse.json({ error: "La prova gratuita non è attiva.", code: "spenta" }, { status: 503 });
  }
  if (!isEchoConfigured()) {
    return NextResponse.json({ error: "Il set è fermo, riprova più tardi." }, { status: 503 });
  }

  let body: { handle?: unknown; scena?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const scena = scenaProva(body.scena);
  if (!scena) return NextResponse.json({ error: "Scegli una delle scene proposte." }, { status: 400 });
  const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
  if (!handle) return NextResponse.json({ error: "Scegli una persona." }, { status: 400 });

  const admin = createServerClient();

  // Il volto dev'essere fra quelli che mettiamo in vetrina: consenso attivo,
  // non ritirato. Si rilegge adesso, non dalla pagina che il visitatore ha aperto.
  const registro = await getPublicAvatars(admin);
  const vetrina = voltiPerLaProva(registro as unknown as Parameters<typeof voltiPerLaProva>[0], 4);
  const scelto = (vetrina as unknown as { handle: string; alias: string; id: string }[]).find((a) => a.handle === handle);
  if (!scelto) return NextResponse.json({ error: "Questa persona non è disponibile per la prova." }, { status: 400 });

  // Le foto vere: senza, non si genera (fail-fast, come il flusso normale).
  const identity = await getReferenceSet(handle);
  if (identity.length === 0) return NextResponse.json({ error: "Questa persona non è disponibile per la prova." }, { status: 400 });

  // Una prova per IP ogni 24 ore, e il tetto di tutti. SEVERI: se il conteggio
  // non risponde, non si spende.
  const ip = ipFrom(request);
  if (!(await allowRequestStrict(`prova:ip:${ip}`, 1, 86400))) {
    return NextResponse.json({ error: "Hai già fatto la tua prova di oggi. Entra nel registro per continuare.", code: "gia_provata" }, { status: 429 });
  }
  if (!(await allowRequestStrict("prova:tutti", tettoProveGiorno(), 86400))) {
    return NextResponse.json({ error: "Per oggi le prove sono finite. Torna domani, o entra e genera quando vuoi.", code: "finite" }, { status: 429 });
  }

  // L'account di servizio: e' Semblic che compra questa foto, ed e' Semblic che
  // paga la persona. Se non c'e' o non ha VOLT, la prova non parte.
  const { data: conto } = await admin.from("profiles").select("id").eq("email", accountProva()).maybeSingle();
  if (!conto?.id) {
    console.warn(`[prova] account di servizio ${accountProva()} assente: prova non disponibile`);
    return NextResponse.json({ error: "La prova gratuita non è attiva.", code: "spenta" }, { status: 503 });
  }

  // Il prezzo e' quello vero di uno scatto: a comprare e' Semblic, non il
  // visitatore. Cosi' ricevuta, storno e royalty restano IDENTICI al flusso
  // normale (un prezzo inventato qui vorrebbe dire un rimborso sbagliato la
  // prima volta che il motore sbaglia). Fuori escono davvero: la quota alla
  // persona e i crediti OpenAI; la commissione la paghiamo a noi stessi.
  const { gross_cents, fee_cents, net_cents, surcharge_cents } = splitEcho(null, MISURA_PROVA, QUALITA_PROVA);
  const jobId = crypto.randomUUID();
  const pricing = { gross_cents, fee_cents, royalty_cents: net_cents, surcharge_cents };
  const params = {
    scene: scena.prompt,
    category: null,
    echoSize: MISURA_PROVA,
    echoQuality: QUALITA_PROVA,
    extras: [],
    identityText: identityPromptFor(scelto as unknown as Parameters<typeof identityPromptFor>[0]),
    pricing,
    prova: true,
  };

  const spesa = await spendVolt(conto.id, gross_cents, `PROVA:${jobId}`);
  if (!spesa.ok && spesa.reason === "insufficient") {
    console.warn("[prova] l'account di servizio ha finito i VOLT: prove sospese");
    return NextResponse.json({ error: "Per oggi le prove sono finite. Torna domani, o entra e genera quando vuoi.", code: "finite" }, { status: 429 });
  }

  const { data: job, error: jobErr } = await admin
    .from("generation_jobs")
    .insert({ id: jobId, engine: "echo", buyer_id: conto.id, avatar_id: scelto.id, handle, params })
    .select("id")
    .single();
  if (jobErr || !job) {
    if (spesa.ok) await grantVolt(conto.id, gross_cents, "refund", `prova:${jobId}`);
    return NextResponse.json({ error: "Il set è occupato: riprova fra poco." }, { status: 503 });
  }

  console.log(`[prova] ${handle} · ${scena.v} · ip ${ip} · job ${jobId}`);
  return NextResponse.json({ ok: true, jobId: job.id, alias: scelto.alias, scena: scena.l });
}
