// ──────────────────────────────────────────────────────────────────────────
// ANIMA sul WORKER (19/9/2026). A ogni giro di /api/jobs/run:
//  1. i video "running" si chiedono al motore; errore o rifiuto = VOLT indietro;
//  2. quelli pronti si prendono (running -> finishing, aggiornamento
//     condizionato: un solo worker li chiude), si scaricano e si CONTROLLANO
//     fotogramma per fotogramma (lib/anima-verifica): volto protetto = video
//     annullato e VOLT indietro; controllo impossibile = si riprova al giro
//     dopo, mai consegna senza controllo;
//  3. solo allora: copia nel nostro storage, certificato, royalty (divisa se la
//     foto e' di gruppo), somiglianza registrata.
// Gira qui e non nella pagina: il video si chiude anche se chi l'ha chiesto ha
// chiuso il browser, e ffmpeg e face-api stanno sul server senza limiti di tempo.
// SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import type { createServerClient } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/storage";
import { grantVolt } from "@/lib/volt";
import { statoVideo } from "@/lib/engines/anima";
import { dividiRoyalty } from "@/lib/gruppo-prezzi";
import { getReferenceSet } from "@/lib/references";
import { riferimentoInCache, misuraScatto } from "@/lib/identity-score";
import { scanGeneratedImageForProtected, outputScanVerdict } from "@/lib/face-scan-server";
import { conCertificato, fotogrammi } from "@/lib/video-fotogrammi";
import { verificaVideo, punteggioVideo } from "@/lib/anima-verifica";

type Admin = ReturnType<typeof createServerClient>;

interface RigaAnima {
  id: string;
  buyer_id: string;
  avatar_id: string;
  source_generation_id: string;
  provider_request_id: string | null;
  status: string;
  movement: string;
  seconds: number;
  gross_cents: number;
  royalty_cents: number;
  created_at: string;
  finishing_at?: string | null;
}

const PER_GIRO = 4;
const FINISHING_ORFANO_MS = 10 * 60 * 1000; // worker morto a meta' della chiusura
const VITA_MASSIMA_MS = 3 * 60 * 60 * 1000; // oltre: annullato e rimborsato

export const MESSAGGIO_PROTETTO = "Nel video è comparso un volto registrato come protetto: video annullato per tutela.";

async function annulla(admin: Admin, a: RigaAnima, messaggio: string, da: string): Promise<boolean> {
  const { data: preso } = await admin
    .from("animations")
    .update({ status: "error", error: messaggio, finished_at: new Date().toISOString() })
    .eq("id", a.id)
    .eq("status", da)
    .select("id")
    .maybeSingle();
  if (preso) await grantVolt(a.buyer_id, a.gross_cents, "refund", `anima:${a.id}`);
  return Boolean(preso);
}

// Chi c'e' nella foto di partenza: una persona, o tutte quelle di una scena di gruppo.
async function personeDi(admin: Admin, a: RigaAnima): Promise<{ id: string; handle: string }[]> {
  const { data: gp } = await admin.from("generation_people").select("avatar_id, posizione").eq("generation_id", a.source_generation_id).order("posizione");
  const ids = gp && gp.length > 1 ? gp.map((r) => r.avatar_id as string) : [a.avatar_id];
  const { data: av } = await admin.from("avatars").select("id, handle").in("id", ids);
  return ids.flatMap((id) => {
    const r = (av ?? []).find((x) => x.id === id);
    return r ? [{ id, handle: r.handle as string }] : [];
  });
}

export async function chiudiAnimazione(admin: Admin, a: RigaAnima, sorgente: string): Promise<"fatto" | "annullato" | "riprova"> {
  let video: Buffer;
  try {
    video = Buffer.from(await (await fetch(sorgente)).arrayBuffer());
    if (video.length < 10_000) throw new Error("video vuoto");
  } catch (e) {
    console.error(`[ANIMA ${a.id}] download fallito`, e instanceof Error ? e.message : e);
    await admin.from("animations").update({ status: "running", finishing_at: null }).eq("id", a.id).eq("status", "finishing");
    return "riprova";
  }

  const persone = await personeDi(admin, a);
  const riferimenti = [];
  for (const p of persone) riferimenti.push(await riferimentoInCache(p.handle, await getReferenceSet(p.handle)).catch(() => null));
  const verifica = await verificaVideo(video, a.seconds, riferimenti, persone.map((p) => p.handle), {
    estrai: fotogrammi,
    scan: async (png) => outputScanVerdict(await scanGeneratedImageForProtected(png)),
    misura: misuraScatto,
  });

  if (verifica.esito === "protetto") {
    console.warn(`[ANIMA ${a.id}] volto protetto al secondo ${verifica.istanteProtetto}: annullato`);
    await annulla(admin, a, MESSAGGIO_PROTETTO, "finishing");
    return "annullato";
  }
  if (verifica.esito === "non_disponibile") {
    // Fail-closed: senza controllo il video non esce. Si riprova al giro dopo.
    console.warn(`[ANIMA ${a.id}] controllo dei volti non disponibile: riprovo`);
    await admin.from("animations").update({ status: "running", finishing_at: null }).eq("id", a.id).eq("status", "finishing");
    return "riprova";
  }

  const certificate = crypto.createHash("sha256").update(`${a.avatar_id}|${a.id}|anima|${a.movement}|${new Date().toISOString().slice(0, 10)}`).digest("hex");
  // Il certificato va anche dentro il file (metadati): Sigil lo legge dal video
  // scaricato. Se la scrittura non riesce il video esce lo stesso, certificato nel registro.
  const marcato = await conCertificato(video, certificate).catch((e) => {
    console.warn(`[ANIMA ${a.id}] certificato nel file non scritto`, e instanceof Error ? e.message : e);
    return video;
  });
  const url = await uploadPublicImage("generations", `${a.avatar_id}/video/${a.id}.mp4`, marcato, "video/mp4");

  const quote = dividiRoyalty(a.royalty_cents, Math.max(1, persone.length));
  for (let i = 0; i < persone.length; i++) {
    const { data: av } = await admin.from("avatars").select("usage_count, royalty_accrued_cents").eq("id", persone[i].id).maybeSingle();
    await admin.from("avatars").update({
      usage_count: (av?.usage_count ?? 0) + 1,
      royalty_accrued_cents: (av?.royalty_accrued_cents ?? 0) + quote[i],
    }).eq("id", persone[i].id);
  }

  await admin.from("animations").update({ status: "done", video_url: url, certificate, finished_at: new Date().toISOString() }).eq("id", a.id);
  // Somiglianza e fotogrammi controllati: update a parte, best effort.
  const { score, minimo } = punteggioVideo(verifica.persone);
  await admin.from("animations").update({ identity_score: score, identity_min: minimo, frames_checked: verifica.fotogrammi }).eq("id", a.id);
  console.log(`[ANIMA ${a.id}] consegnato · ${verifica.fotogrammi} fotogrammi puliti · somiglianza ${score ?? "n/d"}% (min ${minimo ?? "n/d"}%) · ${verifica.persone.map((p) => `${p.chiave} ${p.mediana ?? "n/d"}%`).join(", ")}`);
  return "fatto";
}

// Un giro: ritorna quanti video ha chiuso o annullato.
export async function avanzaAnimazioni(admin: Admin): Promise<number> {
  const adesso = Date.now();
  // Chiusure rimaste a meta' (worker morto): tornano in coda.
  await admin
    .from("animations")
    .update({ status: "running", finishing_at: null })
    .eq("status", "finishing")
    .lt("finishing_at", new Date(adesso - FINISHING_ORFANO_MS).toISOString());

  const { data, error } = await admin
    .from("animations")
    .select("id, buyer_id, avatar_id, source_generation_id, provider_request_id, status, movement, seconds, gross_cents, royalty_cents, created_at")
    .eq("status", "running")
    .not("provider_request_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(PER_GIRO);
  if (error || !data?.length) return 0;

  let chiusi = 0;
  for (const a of data as RigaAnima[]) {
    if (adesso - new Date(a.created_at).getTime() > VITA_MASSIMA_MS) {
      if (await annulla(admin, a, "Il video non è arrivato in tempo.", "running")) chiusi++;
      continue;
    }
    let s;
    try {
      s = await statoVideo(String(a.provider_request_id));
    } catch {
      continue; // rete: al prossimo giro
    }
    if (s.stato === "coda" || s.stato === "lavoro") continue;
    if (s.stato === "errore") {
      const msg = s.motivo === "rifiutato" ? "Il motore ha rifiutato questo movimento per le sue regole sui contenuti." : "Il video non è riuscito.";
      if (await annulla(admin, a, msg, "running")) chiusi++;
      continue;
    }
    if (s.stato !== "fatto") continue;
    const { data: preso } = await admin
      .from("animations")
      .update({ status: "finishing", finishing_at: new Date().toISOString() })
      .eq("id", a.id)
      .eq("status", "running")
      .select("id")
      .maybeSingle();
    if (!preso) continue;
    try {
      if ((await chiudiAnimazione(admin, a, s.url)) !== "riprova") chiusi++;
    } catch (e) {
      console.error(`[ANIMA ${a.id}] chiusura fallita`, e instanceof Error ? e.message : e);
      await admin.from("animations").update({ status: "running", finishing_at: null }).eq("id", a.id).eq("status", "finishing");
    }
  }
  return chiusi;
}
