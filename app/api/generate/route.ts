import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { avatarVetoReason } from "@/lib/avatar-gate";
import { grossForCategory, splitRoyalty, splitEcho } from "@/lib/wallet";
import { echoCostCentsFromUsage } from "@/lib/engines/echo-cost";
import { generateWithHiggsfield, buildGenerationPrompt } from "@/lib/higgsfield";
import { DEFAULT_MODEL, isValidModel, isValidStyle } from "@/lib/soul-models";
import { watermarkPreview, watermarkPreviewBuffer } from "@/lib/watermark";
import { generateEcho, isEchoConfigured, isEchoSize, isEchoQuality } from "@/lib/engines/echo";
import { getReferenceSet } from "@/lib/references";
import { uploadPublicImage } from "@/lib/storage";
import { prepareExtras, identityPromptFor } from "@/lib/echo-job";
import { fetchPosePrompt } from "@/lib/poses";
import { logBlockedRequest } from "@/lib/blocked";
import { spendVolt, grantVolt } from "@/lib/volt";
import sharp from "sharp";

export const runtime = "nodejs";
// Le generazioni ad alta risoluzione (2K/4K) possono durare minuti: alziamo il
// limite. NB: su Vercel Hobby resta capato a ~60s → le risoluzioni alte vanno
// usate in locale o con un piano superiore (o, in futuro, generazione async).
export const maxDuration = 300;

// Compone il prompt finale per ECHO. L'utente NON scrive il collegamento: indica
// solo il RUOLO di ogni immagine (outfit/accessorio/sfondo/oggetto) e noi
// generiamo la frase giusta in modo automatico, semantico (niente numerazione).
type ExtraMeta = { role: string; desc: string };

function clauseForExtra(e: ExtraMeta): string {
  const d = e.desc.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  switch (e.role) {
    case "outfit":
      return `the person is wearing the ${d || "outfit"} shown in the additional reference images`;
    case "accessorio":
      return `the person is wearing or using the ${d || "accessory"} shown in the additional reference images`;
    case "sfondo":
      return `the scene takes place in the ${d || "location"} shown in the additional reference images, used as the background and environment`;
    default:
      return `the image includes the ${d || "object"} shown in the additional reference images`;
  }
}

function buildEchoPrompt(scene: string, extras: ExtraMeta[], poseText?: string | null, identityText?: string | null): string {
  const safe = scene.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  let base =
    "Photorealistic image that preserves the exact facial identity, hair and distinctive features of the same real person shown in the reference photographs. Natural, true-to-life skin and proportions, high-quality commercial photography.";
  // Ancoraggio identità dai metadati verificati (mai testo del client).
  if (identityText) {
    base += ` ${identityText}`;
  }
  // Posa dalla libreria: direttiva TESTUALE (la whitelist è la libreria stessa,
  // vedi lib/poses.ts — qui arriva solo testo nostro, mai del client).
  if (poseText) {
    base += ` The person's body pose: ${poseText}.`;
  }
  const clauses = extras.map(clauseForExtra);
  if (clauses.length > 0) {
    base += " " + clauses.join("; ") + ". Apply each one faithfully and exactly as depicted.";
  }
  return safe ? `${base} Additional direction: ${safe}.` : base;
}

// Decodifica un data-URL immagine e lo ridimensiona per l'invio al motore.
async function dataUrlToBuffer(dataUrl: string): Promise<Buffer | null> {
  const m = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    const raw = Buffer.from(m[1], "base64");
    return await sharp(raw)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const handle = String(body?.handle ?? "").trim();
  // "scene" = direzione artistica libera (azione, ambientazione, luce, stile).
  // Va al motore: l'identità è garantita dal Soul, NON dalle parole del prompt.
  // Retro-compatibilità: accetta anche il vecchio campo "prompt".
  const scene = String(body?.scene ?? body?.prompt ?? "").trim();
  const category = body?.category ? String(body.category).trim() : null;
  // Modello di generazione (default Soul 2.0) e stile (solo Soul ID).
  const model = isValidModel(body?.model) ? body.model : DEFAULT_MODEL;
  const styleId = body?.styleId && isValidStyle(String(body.styleId)) ? String(body.styleId) : null;
  // Modalità: 'preview' (watermark, gratis, no royalty) o 'commercial' (paga + royalty + certificato).
  const isPreview = body?.mode === "preview";
  if (!handle) return NextResponse.json({ error: "Avatar mancante" }, { status: 400 });

  const admin = createServerClient();

  // Rivalida: l'avatar esiste, è SOUL, ha consenso attivo e copre la categoria d'uso.
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, alias, tier, revoked_at, usage_count, royalty_accrued_cents, soul_ref, approved_categories, excluded_categories, gender, age_range, ethnicity, hair_color, eye_color, height, body_type, tattoos, facial_hair, protection_only")
    .eq("handle", handle)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Avatar inesistente" }, { status: 404 });
  // Fase 2.2 (VETO): stato dell'avatar che vieta in modo assoluto la generazione
  // (sola protezione o consenso revocato), in ogni categoria e anche in preview.
  // Decisione condivisa con /api/avatar/soul via lib/avatar-gate, così i due
  // percorsi non possono divergere. Ogni blocco viene loggato (forma della
  // domanda, mai chi chiede): alimenta il Transparency Report e la heatmap.
  const veto = avatarVetoReason(avatar);
  if (veto) {
    logBlockedRequest(admin, { source: "generate", reason: veto, category });
    return NextResponse.json(
      {
        error:
          veto === "protected_face"
            ? "Questo volto e' registrato in sola protezione: la generazione e' vietata."
            : "Consenso revocato: generazione bloccata",
      },
      { status: 403 }
    );
  }
  // Guardrail consenso: solo per uso COMMERCIALE la categoria dev'essere autorizzata.
  // L'anteprima watermarkata è discovery non commerciale: non vincola la categoria.
  if (!isPreview && category) {
    if (avatar.excluded_categories?.includes(category)) {
      logBlockedRequest(admin, { source: "generate", reason: "category_excluded", category });
      return NextResponse.json({ error: `"${avatar.alias}" ha escluso la categoria ${category}` }, { status: 403 });
    }
    if (avatar.approved_categories && !avatar.approved_categories.includes(category)) {
      logBlockedRequest(admin, { source: "generate", reason: "category_not_approved", category });
      return NextResponse.json({ error: `"${avatar.alias}" non ha autorizzato la categoria ${category}` }, { status: 403 });
    }
  }

  // ECHO (gpt-image-2 con identity-lock dal reference-set) e' l'unico motore.
  // Il ramo Higgsfield resta nel file ma irraggiungibile (dormiente).
  const useEcho = true;
  const echoSize = isEchoSize(body?.echoSize) ? body.echoSize : "1024x1024";
  const echoQuality = isEchoQuality(body?.echoQuality) ? body.echoQuality : "high";

  // Posa dalla libreria: il client manda SOLO l'id; lo risolviamo in una
  // direttiva TESTUALE di posa (mai l'immagine del manichino al motore: la
  // metterebbe in scena). Posa inesistente → 400 PRIMA di toccare OpenAI.
  const extraRefs: Array<{ data?: unknown; role?: unknown; desc?: unknown }> =
    Array.isArray(body?.extraRefs) ? body.extraRefs.slice(0, 2) : [];
  let poseText: string | null = null;
  if (useEcho && body?.poseId) {
    poseText = await fetchPosePrompt(String(body.poseId));
    if (!poseText) {
      return NextResponse.json({ error: "Posa non trovata nella libreria" }, { status: 400 });
    }
  }
  // Prefisso identità: i metadati verificati dell'avatar rafforzano le reference.
  const identityText = useEcho ? identityPromptFor(avatar) : null;

  // ── ECHO COMMERCIALE → ASINCRONO ──────────────────────────────────────────
  // La chiamata a gpt-image-2 (con reference) dura da ~1 a ~3 minuti, oltre il
  // limite delle funzioni Vercel: NON generiamo qui. Mettiamo in coda un job,
  // blocchiamo il prezzo, e ritorniamo subito (< 1s). Un worker esterno (la
  // stessa app su host senza cap) esegue la generazione; il client interroga lo
  // stato via /api/generate/job/[id]. (L'anteprima ECHO resta sincrona/dormiente.)
  if (useEcho && !isPreview) {
    if (!isEchoConfigured()) {
      return NextResponse.json({ error: "Motore ECHO non configurato" }, { status: 503 });
    }
    // Fail-fast: serve il reference-set consensuale dell'avatar.
    const identity = await getReferenceSet(handle);
    if (identity.length === 0) {
      return NextResponse.json({ error: "ECHO non disponibile per questo avatar (reference-set assente)" }, { status: 400 });
    }
    const extras = await prepareExtras(extraRefs);
    // Prezzo bloccato ora: dipende da categoria (valore) + size/quality (compute).
    const { gross_cents, fee_cents, net_cents, surcharge_cents } = splitEcho(category, echoSize, echoQuality);
    const params = {
      scene,
      category,
      echoSize,
      echoQuality,
      extras,
      poseText,
      identityText,
      pricing: { gross_cents, fee_cents, royalty_cents: net_cents, surcharge_cents },
    };
    // VOLT: la spesa avviene QUI, insieme alla creazione del job (VOLT_SYSTEM
    // §6.3): se il job poi fallisce, il worker storna. Id job pre-generato per
    // legare il movimento. Sistema non configurato → si procede senza addebito
    // (transizione pre-migrazione, mai un blocco).
    const jobId = crypto.randomUUID();
    let voltBalanceAfter: number | null = null;
    const spent = await spendVolt(user.id, gross_cents, `ECHO:${jobId}`);
    if (!spent.ok && spent.reason === "insufficient") {
      return NextResponse.json(
        { error: "Saldo VOLT insufficiente", volt: { needed: gross_cents, balance: spent.balance ?? 0, missing: gross_cents - (spent.balance ?? 0) } },
        { status: 402 }
      );
    }
    if (spent.ok) voltBalanceAfter = spent.balance;
    const { data: job, error: jobErr } = await admin
      .from("generation_jobs")
      .insert({ id: jobId, engine: "echo", buyer_id: user.id, avatar_id: avatar.id, handle, params })
      .select("id")
      .single();
    if (jobErr || !job) {
      if (spent.ok) await grantVolt(user.id, gross_cents, "refund", `job:${jobId}`);
      return NextResponse.json({ error: "Coda non disponibile: riprova" }, { status: 503 });
    }
    return NextResponse.json({
      ok: true, mode: "async", jobId: job.id, alias: avatar.alias, gross_cents, fee_cents, royalty_cents: net_cents, surcharge_cents,
      volt: spent.ok ? { spent: gross_cents, balance: voltBalanceAfter } : undefined,
    });
  }

  let cleanUrl: string | null = null; // URL pulito (serve al download commerciale)
  let previewData: string | null = null; // anteprima watermarkata (data-URL)
  let generationRef: string;
  let echoUsage: import("@/lib/engines/echo-cost").EchoUsage | undefined; // token reali ECHO

  // ── VOLT (percorso sincrono commerciale) ──────────────────────────────────
  // Spesa PRIMA del motore: mai bruciare compute non pagato. Su qualunque
  // fallimento a valle si storna (riga 'refund' nel ledger + toast al client).
  // Anteprima = gratuita, nessun addebito. Sistema non configurato → procede
  // senza addebito (transizione pre-migrazione).
  const genId = crypto.randomUUID();
  const syncCost = isPreview
    ? 0
    : useEcho
      ? splitEcho(category, echoSize, echoQuality).gross_cents
      : splitRoyalty(grossForCategory(category)).gross_cents;
  let voltCharged = false;
  let voltBalanceAfter: number | null = null;
  if (syncCost > 0) {
    const tierLabel = "ECHO";
    const spent = await spendVolt(user.id, syncCost, `${tierLabel}:${genId}`);
    if (!spent.ok && spent.reason === "insufficient") {
      return NextResponse.json(
        { error: "Saldo VOLT insufficiente", volt: { needed: syncCost, balance: spent.balance ?? 0, missing: syncCost - (spent.balance ?? 0) } },
        { status: 402 }
      );
    }
    if (spent.ok) {
      voltCharged = true;
      voltBalanceAfter = spent.balance;
    }
  }
  // Storno del movimento se la generazione muore dopo la spesa.
  const refundVolt = async () => {
    if (!voltCharged) return null;
    voltCharged = false;
    return grantVolt(user.id, syncCost, "refund", `gen:${genId}`);
  };

  if (useEcho) {
    if (!isEchoConfigured()) {
      return NextResponse.json({ error: "Motore ECHO non configurato" }, { status: 503 });
    }
    // Identity-lock: servono le reference reali e consensuali dell'avatar.
    const identity = await getReferenceSet(handle);
    if (identity.length === 0) {
      return NextResponse.json({ error: "ECHO non disponibile per questo avatar (reference-set assente)" }, { status: 400 });
    }
    // Immagini extra del cliente (capi/scenari + eventuale posa), MAX 2. Totale ≤ 10.
    const rawExtras = extraRefs;
    const extraBuffers: Buffer[] = [];
    const extraMeta: ExtraMeta[] = [];
    for (const ex of rawExtras) {
      const buf = typeof ex?.data === "string" ? await dataUrlToBuffer(ex.data) : null;
      if (!buf) continue;
      extraBuffers.push(buf);
      extraMeta.push({
        role: typeof ex?.role === "string" ? ex.role : "oggetto",
        desc: typeof ex?.desc === "string" ? ex.desc : "",
      });
    }
    // 8 identità + fino a 2 extra, mai oltre il limite di 10 del motore.
    const references = [...identity.slice(0, 10 - extraBuffers.length), ...extraBuffers];

    let png: Buffer;
    try {
      const echoResult = await generateEcho({ prompt: buildEchoPrompt(scene, extraMeta, poseText, identityText), references, size: echoSize, quality: echoQuality });
      png = echoResult.png;
      echoUsage = echoResult.usage;
    } catch (e) {
      const refunded = await refundVolt();
      return NextResponse.json({ error: "Generazione ECHO non riuscita", detail: e instanceof Error ? e.message : undefined, volt_refunded: refunded !== null ? syncCost : undefined }, { status: 502 });
    }
    generationRef = "echo:gpt-image-2";
    if (isPreview) {
      // L'immagine pulita NON viene esposta né caricata: solo l'anteprima watermarkata.
      previewData = await watermarkPreviewBuffer(png);
    } else {
      // Commerciale: carica il PNG pulito su storage; il download imporrà la filigrana.
      try {
        cleanUrl = await uploadPublicImage("generations", `${avatar.id}/${crypto.randomUUID()}.png`, png);
      } catch {
        const refunded = await refundVolt();
        return NextResponse.json({ error: "Salvataggio immagine non riuscito", volt_refunded: refunded !== null ? syncCost : undefined }, { status: 502 });
      }
    }
  } else {
    // Higgsfield Soul (terza parte invisibile). Richiede un avatar SOUL. Il prompt
    // inviato è SOLO la scena: l'identità arriva dal Soul (custom_reference_id).
    if (avatar.tier !== "SOUL") {
      await refundVolt();
      return NextResponse.json({ error: "Solo avatar SOUL sono generabili con questo motore" }, { status: 403 });
    }
    let engineResult;
    try {
      engineResult = await generateWithHiggsfield({
        avatarId: avatar.id,
        soulRef: avatar.soul_ref ?? null,
        prompt: buildGenerationPrompt(scene),
        model,
        styleId: model === "soul-id" ? styleId : null,
        preview: isPreview,
      });
    } catch {
      const refunded = await refundVolt();
      return NextResponse.json({ error: "Generazione non riuscita sul motore", volt_refunded: refunded !== null ? syncCost : undefined }, { status: 502 });
    }
    if (engineResult.status !== "completed") {
      const refunded = await refundVolt();
      return NextResponse.json({ error: "Generazione non riuscita sul motore", volt_refunded: refunded !== null ? syncCost : undefined }, { status: 502 });
    }
    generationRef = engineResult.generationRef;
    cleanUrl = engineResult.imageUrl;
    if (isPreview) previewData = await watermarkPreview(cleanUrl);
  }

  // --- ANTEPRIMA: watermark impresso, nessuna royalty, nessun certificato ---
  // Il client riceve SOLO il data-URL watermarkato; l'URL pulito resta lato server.
  if (isPreview) {
    if (!previewData) {
      return NextResponse.json({ error: "Anteprima non riuscita" }, { status: 502 });
    }
    // Registra l'anteprima (per il conteggio del free trial), senza economia.
    await admin.from("generations").insert({
      avatar_id: avatar.id,
      buyer_id: user.id,
      prompt: scene,
      mode: "preview",
      gross_cents: 0,
      fee_cents: 0,
      royalty_cents: 0,
      image_url: cleanUrl, // archivio interno (null per ECHO: pulito mai esposto)
      engine_ref: generationRef,
    });
    return NextResponse.json({ ok: true, mode: "preview", alias: avatar.alias, image_data: previewData });
  }

  // --- COMMERCIALE ---
  // Il download commerciale (con filigrana invisibile) richiede un URL pulito raggiungibile.
  if (!cleanUrl) {
    const refunded = await refundVolt();
    return NextResponse.json({ error: "Immagine non disponibile", volt_refunded: refunded !== null ? syncCost : undefined }, { status: 502 });
  }
  // Economia. ECHO usa il modello "compute a parte": valore-categoria (royalty
  // 80/20 alla persona) + supplemento-compute (tutto alla piattaforma, copre il
  // costo OpenAI). Higgsfield: il solo valore-categoria, split 80/20 classico.
  let gross_cents: number, fee_cents: number, net_cents: number;
  let surcharge_cents = 0;
  if (useEcho) {
    const s = splitEcho(category, echoSize, echoQuality);
    ({ gross_cents, fee_cents, net_cents, surcharge_cents } = s);
  } else {
    ({ gross_cents, fee_cents, net_cents } = splitRoyalty(grossForCategory(category)));
  }

  // Costo REALE del compute dai token effettivi (solo ECHO; null se l'API non
  // ha restituito usage). Loggato per tarare le tariffe in echo-cost.ts.
  const engineCostCents = useEcho ? echoCostCentsFromUsage(echoUsage) : null;
  if (useEcho) {
    const real = engineCostCents != null ? `${(engineCostCents / 100).toFixed(3)}€` : "n/d";
    const margin = engineCostCents != null ? `${((surcharge_cents - engineCostCents) / 100).toFixed(3)}€` : "n/d";
    console.log(`[ECHO cost] ${echoSize} ${echoQuality} · reale=${real} · supplemento=${(surcharge_cents / 100).toFixed(2)}€ · margine=${margin} · tokens=${JSON.stringify(echoUsage ?? {})}`);
  }

  // Credenziale d'uscita: hash anonimo (nessun dato biometrico) — seme del C2PA.
  // genId pre-generato in alto (lega anche il movimento VOLT della spesa).
  const certificate = crypto
    .createHash("sha256")
    .update(`${avatar.id}|${genId}|${scene}|${new Date().toISOString().slice(0, 10)}`)
    .digest("hex");

  // Registra la generazione con il dettaglio economico.
  // IMPORTANTE: la royalty si accredita SOLO se il record è stato salvato, per non
  // far divergere generations e royalty_accrued_cents (coerenza del percorso pagamenti).
  const { error: genErr } = await admin.from("generations").insert({
    id: genId,
    avatar_id: avatar.id,
    buyer_id: user.id,
    prompt: scene,
    category,
    mode: "commercial",
    gross_cents,
    fee_cents,
    royalty_cents: net_cents, // netto accreditato all'avatar
    certificate,
    image_url: cleanUrl,
    engine_ref: generationRef,
  });
  if (genErr) {
    const refunded = await refundVolt();
    return NextResponse.json({ error: "Generazione non registrata: riprova", volt_refunded: refunded !== null ? syncCost : undefined }, { status: 500 });
  }

  // Accredita la royalty NETTA + incrementa utilizzi (accumulo, non payout).
  await admin
    .from("avatars")
    .update({
      usage_count: (avatar.usage_count ?? 0) + 1,
      royalty_accrued_cents: (avatar.royalty_accrued_cents ?? 0) + net_cents,
    })
    .eq("id", avatar.id);

  // Best-effort: tier (motore usato) + eventuale costo reale del compute. Colonne
  // additive (migrazione echo_cost.sql): se mancano, l'update fallisce in silenzio
  // senza intaccare la generazione già registrata.
  {
    const meta: Record<string, unknown> = { tier: "ECHO" };
    if (engineCostCents != null) meta.engine_cost_cents = engineCostCents;
    await admin.from("generations").update(meta).eq("id", genId);
  }

  return NextResponse.json({
    ok: true,
    mode: "commercial",
    certificate,
    alias: avatar.alias,
    image_url: cleanUrl,
    category,
    gross_cents,
    fee_cents,
    royalty_cents: net_cents,
    surcharge_cents,
    volt: voltCharged || syncCost > 0 ? { spent: voltCharged ? syncCost : 0, balance: voltBalanceAfter } : undefined,
  });
}
