// ──────────────────────────────────────────────────────────────────────────
// CARICAMENTO DIRETTO di un avatar AMBASSADOR (eccezione approvata da Morelz,
// stile Mario/Random): riga nel registro + reference-set su storage privato.
// Il flusso normale resta il self-onboarding con KYC; questo è il percorso
// operatore per gli ambassador che Morelz carica di persona.
//
// Uso:  node --env-file=.env.local scripts/onboard-ambassador.mjs <scheda.json>
//
// Scheda JSON:
// {
//   "handle": "asia", "alias": "Asia", "tier": "SOUL",
//   "dir": "C:/percorso/cartella/foto",          // 8 foto reali (jpg/png)
//   "gender": "donna", "age_range": "18-25", "ethnicity": "caucasico",
//   "hair_color": "neri", "eye_color": "marroni", "body_type": "slim",
//   "height": "media", "facial_hair": "nessuna", "glasses": "no",
//   "tattoos": "visibili", "language": "italiano",
//   "approved_categories": ["Business", ...], "excluded_categories": [],
//   "real_name": "Nome Cognome"                  // opzionale (serve la migrazione)
// }
// Dopo: ricostruire l'indice volti da /account/face-index (admin).
// ──────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!U || !K) { console.error("Mancano le env Supabase (.env.local)"); process.exit(1); }
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

const schedaPath = process.argv[2];
if (!schedaPath) { console.error("Uso: node scripts/onboard-ambassador.mjs <scheda.json>"); process.exit(1); }
// .replace BOM: i file scritti da PowerShell 5.1 con -Encoding utf8 lo includono
const s = JSON.parse(readFileSync(schedaPath, "utf8").replace(/^﻿/, ""));

const MAX_REFS = 8;

async function main() {
  // 1. Handle libero?
  const exists = await (await fetch(`${U}/rest/v1/avatars?handle=eq.${s.handle}&select=id`, { headers: H })).json();
  if (exists.length > 0) { console.error(`Handle '${s.handle}' già nel registro.`); process.exit(1); }

  // 2. Riga avatar (verification_status approved: caricamento operatore)
  const id = crypto.randomUUID();
  const consent_start = new Date().toISOString().slice(0, 10);
  const approved = s.approved_categories ?? [];
  const token_hash = crypto.createHash("sha256")
    .update(`${id}|${consent_start}|${JSON.stringify(approved)}`).digest("hex");

  const row = {
    id, handle: s.handle, alias: s.alias, portrait_url: null, tier: s.tier ?? "SOUL",
    gender: s.gender, age_range: s.age_range, ethnicity: s.ethnicity,
    hair_color: s.hair_color, eye_color: s.eye_color, body_type: s.body_type,
    height: s.height, facial_hair: s.facial_hair ?? "nessuna", glasses: s.glasses ?? "no",
    tattoos: s.tattoos ?? "nessuno", language: s.language ?? "italiano",
    approved_categories: approved, excluded_categories: s.excluded_categories ?? [],
    consent_start, token_hash, usage_count: 0, royalty_accrued_cents: 0,
    is_demo: false, verification_status: "approved",
  };
  let r = await fetch(`${U}/rest/v1/avatars`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(row) });
  if (!r.ok) { console.error("Insert avatar fallito:", await r.text()); process.exit(1); }
  console.log(`✓ avatar '${s.handle}' creato (id ${id})`);

  // 2b. real_name (richiede la migrazione avatar_public_profile.sql): best-effort
  if (s.real_name) {
    const u = await fetch(`${U}/rest/v1/avatars?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ real_name: s.real_name }) });
    console.log(u.ok ? `✓ real_name '${s.real_name}'` : `⚠ real_name NON salvato (migrazione mancante?): riprovare dopo`);
  }

  // 3. Evento consenso
  r = await fetch(`${U}/rest/v1/consent_events`, {
    method: "POST", headers: H,
    body: JSON.stringify({ avatar_id: id, event_type: "GRANTED", detail: "Onboarding ambassador (caricamento operatore)", occurred_at: consent_start }),
  });
  console.log(r.ok ? "✓ consenso registrato" : "⚠ consent_event fallito: " + (await r.text()));

  // 4. Reference-set: resize 1024 e upload su bucket privato references/{handle}/
  const files = readdirSync(s.dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, MAX_REFS);
  if (files.length === 0) { console.error("Nessuna foto nella cartella."); process.exit(1); }
  let n = 0;
  for (let i = 0; i < files.length; i++) {
    const buf = await sharp(readFileSync(join(s.dir, files[i])))
      .rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 }).toBuffer();
    const idx = String(i).padStart(2, "0");
    const up = await fetch(`${U}/storage/v1/object/references/${s.handle}/ref-${idx}.jpg`, {
      method: "POST", headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: buf,
    });
    if (up.ok) n++; else console.error(`⚠ upload ${files[i]} fallito:`, up.status, await up.text());
  }
  console.log(`✓ ${n}/${files.length} reference su storage (ECHO attivo)`);
  console.log("Promemoria: ricostruire l'indice volti da /account/face-index (admin).");
}

main();
