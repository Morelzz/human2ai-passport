import type { DiscoveryProvider, DiscoveryQuery, Candidate } from "./types";
import { hostOf } from "./types";

// Google Cloud Vision WEB_DETECTION: similarita' di CONTENUTO (non biometrica).
// INERTE senza GOOGLE_VISION_API_KEY (enabled=false): si attiva quando arriva la
// chiave. NON invia i volti a un motore di ricerca-volti (rispetta A2.4).
const ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

interface VisionImageRef { url?: string }
interface VisionPage {
  url?: string;
  fullMatchingImages?: VisionImageRef[];
  partialMatchingImages?: VisionImageRef[];
}
export interface WebDetection {
  fullMatchingImages?: VisionImageRef[];
  partialMatchingImages?: VisionImageRef[];
  visuallySimilarImages?: VisionImageRef[];
  pagesWithMatchingImages?: VisionPage[];
}

// PURA: dal webDetection di Vision ai candidati. Sorgenti, in ordine di
// confidenza: full + partial (copie/edit dell'immagine reale) + visuallySimilar
// (immagini VISIVAMENTE simili: e' qui che entrano i lookalike AI non identici).
// La pagina ospitante si ricava da pagesWithMatchingImages (immagine -> url pagina);
// i visuallySimilar di norma non hanno pagina associata -> pageUrl undefined.
// Dedup per url, taglio a `limit`. Il match biometrico 1:1 filtra DOPO.
export function parseWebDetection(web: WebDetection, limit: number): Candidate[] {
  const pageByImage = new Map<string, string>();
  for (const p of web.pagesWithMatchingImages ?? []) {
    const pageUrl = p?.url;
    if (!pageUrl) continue;
    for (const img of [...(p.fullMatchingImages ?? []), ...(p.partialMatchingImages ?? [])]) {
      if (img?.url && !pageByImage.has(img.url)) pageByImage.set(img.url, pageUrl);
    }
  }

  const refs: VisionImageRef[] = [
    ...(web.fullMatchingImages ?? []),
    ...(web.partialMatchingImages ?? []),
    ...(web.visuallySimilarImages ?? []),
  ];

  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const r of refs) {
    const url = r?.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, host: hostOf(url), pageUrl: pageByImage.get(url) });
    if (out.length >= limit) break;
  }
  return out;
}

export class GoogleVisionDiscoveryProvider implements DiscoveryProvider {
  readonly name = "google-vision";
  readonly enabled: boolean;
  private readonly key: string;

  constructor() {
    this.key = process.env.GOOGLE_VISION_API_KEY ?? "";
    this.enabled = this.key.length > 0;
  }

  async find(query: DiscoveryQuery, limit: number): Promise<Candidate[]> {
    if (!this.enabled) throw new Error("GOOGLE_VISION_API_KEY mancante: provider disabilitato");
    if (!query.imageUrl && !query.imageBytes) throw new Error("query discovery senza immagine");

    const image = query.imageUrl
      ? { source: { imageUri: query.imageUrl } }
      : { content: Buffer.from(query.imageBytes as Uint8Array).toString("base64") };
    const body = { requests: [{ image, features: [{ type: "WEB_DETECTION", maxResults: Math.max(10, limit) }] }] };

    const res = await fetch(`${ENDPOINT}?key=${this.key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google Vision ${res.status}`);
    const json = await res.json();
    const web: WebDetection = json?.responses?.[0]?.webDetection ?? {};
    return parseWebDetection(web, limit);
  }
}
