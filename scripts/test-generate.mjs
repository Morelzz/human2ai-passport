// Test di generazione reale Higgsfield Soul.
// Uso: node --env-file=.env.local scripts/test-generate.mjs <soulId> "prompt"
import { HiggsfieldClient } from "@higgsfield/client";

const apiKey = process.env.HIGGSFIELD_API_KEY;
const apiSecret = process.env.HIGGSFIELD_API_SECRET;
if (!apiKey || !apiSecret) { console.error("Credenziali Higgsfield mancanti"); process.exit(1); }

const soulId = process.argv[2];
const prompt = process.argv[3] || "professional portrait, studio lighting, looking at camera";
if (!soulId) { console.error("Uso: node ... scripts/test-generate.mjs <soulId> \"prompt\""); process.exit(1); }

const client = new HiggsfieldClient({ apiKey, apiSecret });

console.log(`Genero con Soul ${soulId}...`);
console.log(`Prompt: ${prompt}`);
const jobSet = await client.generate(
  "/v1/text2image/soul",
  { prompt, custom_reference_id: soulId, width_and_height: "1536x2048", quality: "1080p", batch_size: 1 },
  { withPolling: true }
);

console.log(`\nJobSet id: ${jobSet.id}`);
console.log(`NSFW: ${jobSet.isNsfw}  |  Completed: ${jobSet.isCompleted}  |  Failed: ${jobSet.isFailed}`);
const url = jobSet.jobs?.[0]?.results?.raw?.url ?? "";
console.log(`\nIMMAGINE: ${url || "(nessuna)"}`);
