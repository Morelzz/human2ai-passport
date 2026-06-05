// Helper di test Enterprise: crea un operatore (admin), un'organizzazione
// (enterprise) e un avatar di prova in attesa di consenso. Stampa i link pronti.
//
// PREREQUISITO: applica prima enterprise.sql + consent_link.sql su Supabase.
// Uso: node --env-file=.env.local scripts/seed-enterprise-test.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const BASE = process.argv[2] || "http://localhost:3000";
const PWD = "Test1234!";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Crea (o recupera) un utente Auth e imposta ruolo + kyc nel profilo.
async function ensureUser(email, role, kyc) {
  let userId;
  const created = await sb.auth.admin.createUser({ email, password: PWD, email_confirm: true });
  if (created.data?.user) {
    userId = created.data.user.id;
  } else {
    // Esiste già: cercalo tra gli utenti.
    const list = await sb.auth.admin.listUsers({ perPage: 1000 });
    userId = list.data?.users?.find((u) => u.email === email)?.id;
    if (!userId) throw new Error(`Impossibile creare/trovare ${email}: ${created.error?.message}`);
  }
  const { error } = await sb.from("profiles").upsert({ id: userId, email, role, kyc_status: kyc });
  if (error) {
    console.error(`  ⚠ profilo ${email}: impostazione ruolo '${role}' FALLITA -> ${error.message}`);
    console.error(`    Applica l'aggiornamento del check su profiles.role (vedi enterprise.sql).`);
  }
  return userId;
}

console.log("Setup account di test…");
const adminId = await ensureUser("admin@h2ai.test", "admin", "approved");
const orgId = await ensureUser("org@h2ai.test", "enterprise", "approved");
console.log(`  admin  -> admin@h2ai.test  (${adminId})`);
console.log(`  org    -> org@h2ai.test    (${orgId})`);

// Avatar di prova: ricrea pulito a ogni run (fresh consent_token, pending).
const handle = "test-org-avatar";
await sb.from("avatars").delete().eq("handle", handle);

const id = crypto.randomUUID();
const consentStart = new Date().toISOString().slice(0, 10);
const consentToken = crypto.randomBytes(24).toString("hex");
const tokenHash = crypto.createHash("sha256").update(`${id}|${consentStart}`).digest("hex");

const { error } = await sb.from("avatars").insert({
  id,
  owner_id: orgId,
  handle,
  alias: "Avatar di Prova",
  tier: "SOUL",
  gender: "uomo",
  age_range: "25-35",
  ethnicity: "italiano",
  hair_color: "castani",
  approved_categories: ["Fashion", "Travel"],
  consent_start: consentStart,
  token_hash: tokenHash,
  verification_status: "pending_review",
  consent_token: consentToken,
});

if (error) {
  console.error("\nERRORE inserimento avatar:", error.message);
  console.error("Hai applicato enterprise.sql + consent_link.sql su Supabase?");
  process.exit(1);
}

console.log("\n=== PRONTO ===");
console.log(`Password (entrambi gli account): ${PWD}`);
console.log(`\n1) Persona conferma il consenso:\n   ${BASE}/consent/${consentToken}`);
console.log(`\n2) Accedi come admin e revisiona:\n   login: admin@h2ai.test / ${PWD}\n   coda:  ${BASE}/account/review`);
console.log(`\n(Org per creare altri avatar dall'app: org@h2ai.test / ${PWD})`);
console.log(`\nRi-esegui lo script per resettare l'avatar di prova.`);
