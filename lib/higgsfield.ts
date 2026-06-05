import crypto from "crypto";

// Bridge verso il motore di generazione (Higgsfield Soul).
// Il motore è una terza parte INVISIBILE all'utente finale: vive SOLO lato server,
// la chiave sta in .env.local e non esce mai nel client.
//
// Due modalità, selezionate via env HIGGSFIELD_MODE:
//   - "mock" (default, offline): nessuna rete, output deterministico simulato.
//   - "live": chiama l'API reale (da configurare quando avrai la chiave).
//
// Il resto della piattaforma usa SOLO generateWithHiggsfield(): cambiando modalità
// non si tocca nient'altro (match, certificato, royalty restano identici).

export interface HiggsfieldInput {
  avatarId: string;
  // Riferimento del soggetto reale sul motore (es. id del modello Soul addestrato).
  // Per gli avatar demo può essere null: il mock genera comunque un placeholder.
  soulRef: string | null;
  prompt: string;
}

export interface HiggsfieldResult {
  engine: "higgsfield-soul";
  mode: "mock" | "live";
  generationRef: string;   // id della generazione sul motore
  status: "completed" | "failed";
  imageUrl: string;        // URL dell'immagine generata
}

function mode(): "mock" | "live" {
  return process.env.HIGGSFIELD_MODE === "live" ? "live" : "mock";
}

// --- MOCK (offline) ---------------------------------------------------------
// Output deterministico: stesso avatar+prompt -> stessa immagine placeholder.
// Simula un piccolo ritardo come farebbe l'API reale.
async function generateMock(input: HiggsfieldInput): Promise<HiggsfieldResult> {
  await new Promise((r) => setTimeout(r, 600));

  const seed = crypto
    .createHash("sha256")
    .update(`${input.avatarId}|${input.prompt}`)
    .digest("hex")
    .slice(0, 16);

  const imageUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=6B21E8`;

  return {
    engine: "higgsfield-soul",
    mode: "mock",
    generationRef: `mock_${seed}`,
    status: "completed",
    imageUrl,
  };
}

// --- LIVE (Higgsfield Soul, SDK ufficiale @higgsfield/client) ----------------
async function generateLive(input: HiggsfieldInput): Promise<HiggsfieldResult> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET mancanti per la modalità live");
  }
  if (!input.soulRef) {
    // Senza un Soul ID collegato non possiamo garantire l'identità della persona reale.
    throw new Error("soulRef mancante: questo avatar non ha un modello Soul collegato");
  }

  const { HiggsfieldClient } = await import("@higgsfield/client");
  const client = new HiggsfieldClient({ apiKey, apiSecret });

  // Soul text-to-image con il riferimento del volto reale (custom_reference_id).
  // withPolling: l'SDK attende il completamento prima di restituire il JobSet.
  const jobSet = await client.generate(
    "/v1/text2image/soul",
    { prompt: input.prompt, custom_reference_id: input.soulRef },
    { withPolling: true }
  );

  if (jobSet.isNsfw) {
    return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "failed", imageUrl: "" };
  }
  if (!jobSet.isCompleted) {
    return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "failed", imageUrl: "" };
  }

  const imageUrl = jobSet.jobs[0]?.results?.raw.url ?? "";
  if (!imageUrl) {
    return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "failed", imageUrl: "" };
  }

  return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "completed", imageUrl };
}

// Elenca i Soul ID esistenti sull'account (per collegarli agli avatar).
export interface SoulIdItem { id: string; name: string; status: string; }
export async function listSoulIds(): Promise<SoulIdItem[]> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET mancanti");
  }
  const { HiggsfieldClient } = await import("@higgsfield/client");
  const client = new HiggsfieldClient({ apiKey, apiSecret });
  const res = await client.listSoulIds(1, 100);
  return res.items.map((s) => ({ id: s.id, name: s.name, status: String(s.status) }));
}

export async function generateWithHiggsfield(input: HiggsfieldInput): Promise<HiggsfieldResult> {
  return mode() === "live" ? generateLive(input) : generateMock(input);
}
