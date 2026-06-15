// ──────────────────────────────────────────────────────────────────────────
// ECHO — esecuzione ASINCRONA della generazione (coda generation_jobs).
//
// Logica condivisa tra:
//  - ENQUEUE (in /api/generate, su Vercel): prepara gli extra e blocca il prezzo.
//  - WORKER (in /api/jobs/run, su host senza cap di durata): esegue la chiamata
//    lunga a OpenAI, carica l'immagine, registra generazione + royalty, e
//    riscrive l'esito sul job.
//
// SERVER-ONLY (usa sharp/crypto/storage). Riusa i sistemi esistenti: getReferenceSet,
// generateEcho, uploadPublicImage, echoCostCentsFromUsage. Nessuna duplicazione.
// ──────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import sharp from "sharp";
import type { createServerClient } from "@/lib/supabase";
import { getReferenceSet } from "@/lib/references";
import { generateEcho, type EchoSize, type EchoQuality } from "@/lib/engines/echo";
import { echoCostCentsFromUsage, echoResLabel } from "@/lib/engines/echo-cost";
import { uploadPublicImage } from "@/lib/storage";

type Admin = ReturnType<typeof createServerClient>;

// Immagine extra del cliente (outfit/scenario/…), già ridimensionata, in base64.
export interface EchoExtra {
  role: string;
  desc: string;
  data: string; // JPEG base64 (≤1024px)
}

// Prezzo BLOCCATO al momento dell'enqueue (non si ricalcola nel worker).
export interface EchoPricing {
  gross_cents: number;
  fee_cents: number;
  royalty_cents: number;
  surcharge_cents: number;
}

// Tutto ciò che serve al worker per generare, serializzato nel job.params.
export interface EchoJobParams {
  scene: string;
  category: string | null;
  echoSize: EchoSize;
  echoQuality: EchoQuality;
  extras: EchoExtra[];
  // Posa dalla libreria, già risolta in TESTO inglese all'enqueue (mai immagine:
  // l'endpoint edits metterebbe il manichino in scena). Opzionale.
  poseText?: string | null;
  // Prefisso identità dai metadati verificati dell'avatar (identityPromptFor).
  identityText?: string | null;
  pricing: EchoPricing;
}

// Riga minima del job che il worker consuma.
export interface EchoJobRow {
  id: string;
  avatar_id: string;
  handle: string;
  buyer_id: string;
  attempts: number | null;
  params: EchoJobParams;
}

// ── Prefisso identità invisibile ─────────────────────────────────────────────
// I metadati VERIFICATI dell'avatar (identikit confermato dalla persona)
// diventano un ancoraggio testuale che lavora INSIEME alle reference: ogni
// generazione parte già orientata sui tratti giusti. Regola: tratti immutabili
// dichiarati come fatti; i CAPELLI descritti come tratto naturale senza vietare
// lo styling (il cliente può legittimamente chiederli raccolti/coperti).
// Valori non mappati → omessi (mai italiano grezzo nel prompt inglese).
export interface AvatarIdentity {
  gender?: string | null;
  age_range?: string | null;
  ethnicity?: string | null;
  hair_color?: string | null;
  eye_color?: string | null;
  height?: string | null;
  body_type?: string | null;
  tattoos?: string | null;
  facial_hair?: string | null;
}

const ETHNICITY_EN: Record<string, string> = {
  italiana: "Italian", italiano: "Italian", spagnola: "Spanish", spagnolo: "Spanish",
  francese: "French", tedesca: "German", tedesco: "German", giapponese: "Japanese",
  cinese: "Chinese", indiana: "Indian", indiano: "Indian", nigeriana: "Nigerian",
  nigeriano: "Nigerian", afroamericana: "African American", afroamericano: "African American",
  caucasica: "Caucasian", caucasico: "Caucasian", latina: "Latina", latino: "Latino",
  araba: "Arab", arabo: "Arab",
};
const HAIR_EN: Record<string, string> = {
  neri: "black", castani: "brown", biondi: "blonde", rossi: "red", grigi: "grey",
  rasati: "buzz-cut", calvo: "shaved (bald)",
};
const EYES_EN: Record<string, string> = {
  azzurri: "blue", blu: "blue", verdi: "green", marroni: "brown", castani: "brown",
  neri: "dark", grigi: "grey", nocciola: "hazel",
};
const HEIGHT_EN: Record<string, string> = { bassa: "short", media: "of average height", alta: "tall" };
const BODY_EN: Record<string, string> = {
  slim: "slim", magra: "slim", magro: "slim", "in forma": "fit", atletica: "athletic",
  atletico: "athletic", normale: "average build", curvy: "curvy", robusta: "heavyset",
  robusto: "heavyset", sovrappeso: "heavyset",
};

export function identityPromptFor(a: AvatarIdentity): string | null {
  const gender = a.gender === "donna" ? "woman" : a.gender === "uomo" ? "man" : null;
  const eth = a.ethnicity ? ETHNICITY_EN[a.ethnicity.toLowerCase().trim()] : null;
  const parts: string[] = [];
  parts.push(`${eth ? eth + " " : ""}${gender ?? "person"}`.trim());
  if (a.age_range) parts.push(`apparent age ${a.age_range}`);
  const height = a.height ? HEIGHT_EN[a.height.toLowerCase().trim()] : null;
  if (height) parts.push(height);
  const body = a.body_type ? BODY_EN[a.body_type.toLowerCase().trim()] : null;
  if (body) parts.push(`${body} build`);
  const eyes = a.eye_color ? EYES_EN[a.eye_color.toLowerCase().trim()] : null;
  if (eyes) parts.push(`${eyes} eyes`);
  if (a.tattoos && a.tattoos.toLowerCase() !== "nessuno" && a.tattoos.toLowerCase() !== "no") {
    parts.push("with visible tattoos");
  }
  if (a.facial_hair && !["nessuna", "nessuno", "no"].includes(a.facial_hair.toLowerCase())) {
    parts.push("with facial hair");
  }
  // Nessun dato utile (solo "person") → meglio nessun prefisso.
  if (parts.length === 1 && parts[0] === "person") return null;
  const article = /^[aeiou]/i.test(parts[0]) ? "an" : "a";
  let s = `The person is ${article} ${parts.join(", ")}.`;
  const hair = a.hair_color ? HAIR_EN[a.hair_color.toLowerCase().trim()] : null;
  if (hair) s += ` Their natural hair is ${hair}.`;
  return s;
}

// ── Prompt (spostato da /api/generate, invariato) ───────────────────────────
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

export function buildEchoPrompt(scene: string, extras: ExtraMeta[], poseText?: string | null, identityText?: string | null): string {
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

// Decodifica un data-URL immagine e lo ridimensiona a ≤1024px (JPEG).
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

// ENQUEUE: prepara fino a 2 immagini extra del cliente per la serializzazione.
export async function prepareExtras(rawExtras: unknown): Promise<EchoExtra[]> {
  const list = Array.isArray(rawExtras) ? rawExtras.slice(0, 2) : [];
  const out: EchoExtra[] = [];
  for (const ex of list) {
    const e = ex as { data?: unknown; role?: unknown; desc?: unknown };
    const buf = typeof e?.data === "string" ? await dataUrlToBuffer(e.data) : null;
    if (!buf) continue;
    out.push({
      role: typeof e?.role === "string" ? e.role : "oggetto",
      desc: typeof e?.desc === "string" ? e.desc : "",
      data: buf.toString("base64"),
    });
  }
  return out;
}

// Storno VOLT idempotente di un job (la spesa e' avvenuta all'enqueue, ref
// ECHO:<id>). grantVolt e' no-op su un refund job:<id> gia' presente (fix
// volt_idempotency); storniamo solo se la spesa esiste davvero.
async function refundJobVolt(admin: Admin, jobId: string, buyerId: string, grossCents: number | undefined): Promise<void> {
  if (!grossCents || grossCents <= 0) return;
  try {
    const { grantVolt } = await import("@/lib/volt");
    const { count: spentCount } = await admin
      .from("volt_transactions")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", buyerId)
      .eq("type", "generation")
      .eq("ref", `ECHO:${jobId}`);
    if ((spentCount ?? 0) > 0) {
      await grantVolt(buyerId, grossCents, "refund", `job:${jobId}`);
    }
  } catch {
    /* sistema VOLT non configurato: nessuno storno necessario */
  }
}

// REAPER: i job rimasti 'running' troppo a lungo = worker morto a meta'. Senza
// questo restano per sempre (il poller pesca solo 'pending'), mangiano i VOLT
// spesi all'enqueue e tengono il client su uno spinner morto. Li chiudiamo in
// errore e li storniamo (idempotente). Va chiamato a ogni tick prima del claim.
export async function reapStaleJobs(admin: Admin, staleMs = 10 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - staleMs).toISOString();
  const { data: stale } = await admin
    .from("generation_jobs")
    .select("id, buyer_id, params")
    .eq("status", "running")
    .lt("started_at", cutoff);
  let reaped = 0;
  for (const job of (stale ?? []) as { id: string; buyer_id: string; params: EchoJobParams }[]) {
    const { data: done } = await admin
      .from("generation_jobs")
      .update({ status: "error", finished_at: new Date().toISOString(), error: "job orfano: worker interrotto, rilasciato dal reaper" })
      .eq("id", job.id)
      .eq("status", "running")
      .select("id");
    if (done && done.length > 0) {
      reaped++;
      await refundJobVolt(admin, job.id, job.buyer_id, job.params?.pricing?.gross_cents);
    }
  }
  if (reaped > 0) console.log(`[reaper] ${reaped} job orfani chiusi e stornati`);
  return reaped;
}

// WORKER: esegue UN job ECHO end-to-end e ne riscrive l'esito. Non lancia: gli
// errori vengono registrati sul job (status 'error') così il poller prosegue.
export async function executeEchoJob(admin: Admin, job: EchoJobRow): Promise<void> {
  const nowIso = () => new Date().toISOString();
  await admin
    .from("generation_jobs")
    .update({ status: "running", started_at: nowIso(), attempts: (job.attempts ?? 0) + 1 })
    .eq("id", job.id);

  try {
    const p = job.params;

    // Identity-lock: reference reali e consensuali dell'avatar.
    const identity = await getReferenceSet(job.handle);
    if (identity.length === 0) throw new Error("reference-set assente per l'avatar");

    const extraBuffers = (p.extras ?? []).map((e) => Buffer.from(e.data, "base64"));
    const extraMeta: ExtraMeta[] = (p.extras ?? []).map((e) => ({ role: e.role, desc: e.desc }));
    const references = [...identity.slice(0, 10 - extraBuffers.length), ...extraBuffers];

    // La chiamata lunga (può durare minuti): qui NON c'è cap di durata.
    const result = await generateEcho({
      prompt: buildEchoPrompt(p.scene, extraMeta, p.poseText, p.identityText),
      references,
      size: p.echoSize,
      quality: p.echoQuality,
    });

    // Carica il PNG pulito (il download imporrà la filigrana invisibile).
    const cleanUrl = await uploadPublicImage("generations", `${job.avatar_id}/${crypto.randomUUID()}.png`, result.png);

    const engineCostCents = echoCostCentsFromUsage(result.usage);
    const { gross_cents, fee_cents, royalty_cents, surcharge_cents } = p.pricing;

    // Credenziale d'uscita: hash anonimo (nessun dato biometrico) — seme del C2PA.
    const genId = crypto.randomUUID();
    const certificate = crypto
      .createHash("sha256")
      .update(`${job.avatar_id}|${genId}|${p.scene}|${nowIso().slice(0, 10)}`)
      .digest("hex");

    // Registra la generazione (royalty accreditata SOLO se l'insert riesce).
    const { error: genErr } = await admin.from("generations").insert({
      id: genId,
      avatar_id: job.avatar_id,
      buyer_id: job.buyer_id,
      prompt: p.scene,
      category: p.category,
      mode: "commercial",
      gross_cents,
      fee_cents,
      royalty_cents,
      certificate,
      image_url: cleanUrl,
      engine_ref: "echo:gpt-image-2",
    });
    if (genErr) throw new Error(`registrazione generazione fallita: ${genErr.message}`);

    // Best-effort: tier 'ECHO' + costo reale del compute (colonne additive, vedi
    // echo_cost.sql). Se mancano, l'update fallisce in silenzio senza intaccare la gen.
    const meta: Record<string, unknown> = { tier: "ECHO" };
    if (engineCostCents != null) meta.engine_cost_cents = engineCostCents;
    await admin.from("generations").update(meta).eq("id", genId);

    // Accredita la royalty NETTA + incrementa utilizzi.
    const { data: av } = await admin
      .from("avatars")
      .select("usage_count, royalty_accrued_cents")
      .eq("id", job.avatar_id)
      .maybeSingle();
    await admin
      .from("avatars")
      .update({
        usage_count: (av?.usage_count ?? 0) + 1,
        royalty_accrued_cents: (av?.royalty_accrued_cents ?? 0) + royalty_cents,
      })
      .eq("id", job.avatar_id);

    await admin
      .from("generation_jobs")
      .update({
        status: "done",
        finished_at: nowIso(),
        certificate,
        image_url: cleanUrl,
        gross_cents,
        fee_cents,
        royalty_cents,
        surcharge_cents,
        engine_cost_cents: engineCostCents,
      })
      .eq("id", job.id);

    const real = engineCostCents != null ? `${(engineCostCents / 100).toFixed(3)}€` : "n/d";
    console.log(`[ECHO job ${job.id}] done · ${echoResLabel(p.echoSize)} ${p.echoSize} ${p.echoQuality} · reale=${real} · suppl=${(surcharge_cents / 100).toFixed(2)}€`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore sconosciuto";
    await admin.from("generation_jobs").update({ status: "error", finished_at: nowIso(), error: msg.slice(0, 500) }).eq("id", job.id);
    // La spesa è avvenuta all'enqueue (ref ECHO:<jobId>); il job è morto → storno
    // automatico (VOLT_SYSTEM §6.3), idempotente (fix volt_idempotency).
    await refundJobVolt(admin, job.id, job.buyer_id, job.params.pricing.gross_cents);
    console.error(`[ECHO job ${job.id}] error: ${msg}`);
  }
}
