import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";
import { interpretToStudio } from "@/lib/voice/studio-interpret";

export const runtime = "nodejs";
export const maxDuration = 20;

// ──────────────────────────────────────────────────────────────────────────
// /api/studio/interpret — REGIA VOCALE. Traduce una descrizione (parlata o
// scritta) di una foto nelle scelte dello Studio: scena libera + posa,
// inquadratura, espressione, stile colore, macchina, ottica, luce. Stessa
// Claude API dell'enhancer. L'output e' validato su whitelist dalla funzione
// pura interpretToStudio (mai testo libero del client come parametro): il
// client applica solo i token noti. Non parte mai da solo, lo chiama l'utente.
//
// VINCOLO: la regia NON tocca la categoria d'uso (chip esplicito, validato in
// /api/generate) e NON descrive il volto o l'identita (bloccata dall'avatar).
// ──────────────────────────────────────────────────────────────────────────

const SYSTEM = `Traduci una descrizione (parlata o scritta) di una foto da generare nelle scelte dello Studio Semblic.
L'identita del volto e' bloccata dall'avatar reale: NON descrivere MAI viso, eta, etnia o identita. Solo fotorealismo.

Rispondi SOLO con JSON valido:
{"scene":"","pose":"","framing":"","expression":"","colorStyle":"","camera":"","lens":"","light":""}

"scene" = SOLO la descrizione libera (azione, luogo, abbigliamento, atmosfera), SENZA i parametri tecnici qui sotto, che vanno nei loro campi. Italiano, massimo 300 caratteri. Se non c'e' descrizione, "".

Per OGNI campo scegli UNO dei valori elencati SOLO se la descrizione lo implica chiaramente, altrimenti "". Non forzare, non inventare valori fuori lista.

framing (inquadratura): primo_piano (primo piano, volto), mezzo_busto (vita in su), figura_intera (corpo intero), americano (dalle ginocchia in su)
pose: casuale, in_piedi, tre_quarti, mani_tasca (mani in tasca), mani_fianchi (mani sui fianchi), braccia_conserte, mano_mento (mano al mento), al_muro (appoggiato al muro), profilo, braccia_aperte, sgabello (su sgabello), a_terra (seduto a terra), camminata (mentre cammina), di_spalle, prodotto_mano (prodotto in mano)
expression (espressione): sorriso, serio, pensieroso, risata (ride)
colorStyle (stile colore): bn (bianco e nero), pastello, cinematico, contrasto (contrasto forte), flash (effetto flash diretto)
camera (macchina): analogica (pellicola, 35mm film, grana), full_frame, medio_formato, polaroid
lens (ottica): 8mm (fisheye), 12mm, 20mm, 35mm (reportage), 50mm (naturale), 85mm (ritratto, sfondo sfocato, bokeh), 200mm (teleobiettivo)
light (luce): naturale, golden (golden hour, luce dorata, tramonto), studio (softbox), controluce, neon (notturno)

Esempi:
"primo piano in bianco e nero" -> framing primo_piano, colorStyle bn
"lei che ride in spiaggia al tramonto, look estivo" -> scene "in spiaggia con look estivo", expression risata, light golden
"ritratto con lo sfondo sfocato" -> framing primo_piano, lens 85mm
"in piedi, braccia conserte, luce da studio" -> pose braccia_conserte, light studio`;

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  // Rate-limit per utente: la regia chiama Claude (costo). Max 20/min.
  if (!(await allowRequest(`studio-interpret:${user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Regia non configurata" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.text ?? "").trim().slice(0, 400);
  if (text.length < 3) {
    return NextResponse.json({ error: "Descrivi prima la scena" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 320,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    });
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const parsed = JSON.parse(raw.replace(/^```json?/i, "").replace(/```$/, "").trim());
    // Whitelist + scena ripulita: solo token noti escono di qui.
    return NextResponse.json(interpretToStudio(parsed));
  } catch {
    return NextResponse.json({ error: "Regia non riuscita, riprova" }, { status: 502 });
  }
}
