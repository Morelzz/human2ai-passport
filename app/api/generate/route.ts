import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { grossForCategory, grossForEcho, splitRoyalty } from "@/lib/wallet";
import { generateWithHiggsfield, buildGenerationPrompt } from "@/lib/higgsfield";
import { DEFAULT_MODEL, isValidModel, isValidStyle } from "@/lib/soul-models";
import { watermarkPreview, watermarkPreviewBuffer } from "@/lib/watermark";
import { generateEcho, isEchoConfigured, isEchoSize, isEchoQuality } from "@/lib/engines/echo";
import { getReferenceSet } from "@/lib/references";
import { uploadPublicImage } from "@/lib/storage";
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

function buildEchoPrompt(scene: string, extras: ExtraMeta[]): string {
  const safe = scene.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  let base =
    "Photorealistic image that preserves the exact facial identity, hair and distinctive features of the same real person shown in the reference photographs. Natural, true-to-life skin and proportions, high-quality commercial photography.";
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
    .select("id, alias, tier, revoked_at, usage_count, royalty_accrued_cents, soul_ref, approved_categories, excluded_categories")
    .eq("handle", handle)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Avatar inesistente" }, { status: 404 });
  if (avatar.revoked_at) return NextResponse.json({ error: "Consenso revocato: generazione bloccata" }, { status: 403 });
  // Guardrail consenso: solo per uso COMMERCIALE la categoria dev'essere autorizzata.
  // L'anteprima watermarkata è discovery non commerciale: non vincola la categoria.
  if (!isPreview && category) {
    if (avatar.excluded_categories?.includes(category)) {
      return NextResponse.json({ error: `"${avatar.alias}" ha escluso la categoria ${category}` }, { status: 403 });
    }
    if (avatar.approved_categories && !avatar.approved_categories.includes(category)) {
      return NextResponse.json({ error: `"${avatar.alias}" non ha autorizzato la categoria ${category}` }, { status: 403 });
    }
  }

  // Selezione del motore. ECHO = gpt-image-2 con identity-lock dal reference-set;
  // default = Higgsfield Soul. I motori restano terze parti INVISIBILI, lato server.
  const useEcho = body?.engine === "echo";
  const echoSize = isEchoSize(body?.echoSize) ? body.echoSize : "1024x1024";
  const echoQuality = isEchoQuality(body?.echoQuality) ? body.echoQuality : "high";

  let cleanUrl: string | null = null; // URL pulito (serve al download commerciale)
  let previewData: string | null = null; // anteprima watermarkata (data-URL)
  let generationRef: string;

  if (useEcho) {
    if (!isEchoConfigured()) {
      return NextResponse.json({ error: "Motore ECHO non configurato" }, { status: 503 });
    }
    // Identity-lock: servono le reference reali e consensuali dell'avatar.
    const identity = await getReferenceSet(handle);
    if (identity.length === 0) {
      return NextResponse.json({ error: "ECHO non disponibile per questo avatar (reference-set assente)" }, { status: 400 });
    }
    // Immagini extra del cliente (capi/scenari), MAX 2. Totale immagini ≤ 10.
    const rawExtras = Array.isArray(body?.extraRefs) ? body.extraRefs.slice(0, 2) : [];
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
      png = (await generateEcho({ prompt: buildEchoPrompt(scene, extraMeta), references, size: echoSize, quality: echoQuality })).png;
    } catch (e) {
      return NextResponse.json({ error: "Generazione ECHO non riuscita", detail: e instanceof Error ? e.message : undefined }, { status: 502 });
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
        return NextResponse.json({ error: "Salvataggio immagine non riuscito" }, { status: 502 });
      }
    }
  } else {
    // Higgsfield Soul (terza parte invisibile). Richiede un avatar SOUL. Il prompt
    // inviato è SOLO la scena: l'identità arriva dal Soul (custom_reference_id).
    if (avatar.tier !== "SOUL") {
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
      return NextResponse.json({ error: "Generazione non riuscita sul motore" }, { status: 502 });
    }
    if (engineResult.status !== "completed") {
      return NextResponse.json({ error: "Generazione non riuscita sul motore" }, { status: 502 });
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
    return NextResponse.json({ error: "Immagine non disponibile" }, { status: 502 });
  }
  // Economia: prezzo lordo per categoria (ECHO: + sovrapprezzo risoluzione/qualità),
  // diviso in fee piattaforma + netto avatar.
  const gross = useEcho ? grossForEcho(category, echoSize, echoQuality) : grossForCategory(category);
  const { gross_cents, fee_cents, net_cents } = splitRoyalty(gross);

  // Credenziale d'uscita: hash anonimo (nessun dato biometrico) — seme del C2PA.
  const genId = crypto.randomUUID();
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
    return NextResponse.json({ error: "Generazione non registrata: riprova" }, { status: 500 });
  }

  // Accredita la royalty NETTA + incrementa utilizzi (accumulo, non payout).
  await admin
    .from("avatars")
    .update({
      usage_count: (avatar.usage_count ?? 0) + 1,
      royalty_accrued_cents: (avatar.royalty_accrued_cents ?? 0) + net_cents,
    })
    .eq("id", avatar.id);

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
  });
}
