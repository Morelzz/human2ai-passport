import { createHash } from "node:crypto";
import { rdapLookup, type WhoisSummary } from "./whois";

export { dhash, phashOf } from "./phash";
export { rdapLookup, registrableDomain } from "./whois";
export type { WhoisSummary } from "./whois";
export { capturePage, closeBrowser } from "./capture";
export type { PageCapture } from "./capture";

// Orchestratore di evidence capture (spec 3.3.5): dato un match, cattura la
// pagina (screenshot + HTML), calcola l'hash di integrita', allega il WHOIS
// (RDAP) e inserisce una riga evidence_records. NIENTE phash qui: il phash del
// match e' gia' stato calcolato dallo scan (A2.3). Dependency injection completa.

export interface EvidenceInput {
  matchId: string;
  sourceUrl: string; // l'immagine
  pageUrl?: string; // pagina ospitante, se nota
  host: string;
}

export interface EvidenceArtifacts {
  screenshotPath: string;
  htmlPath: string;
  whois: WhoisSummary;
  hash: string; // sha256 dello screenshot (tamper-evident)
}

export interface EvidenceStorage {
  // carica i bytes nel bucket privato e ritorna il path salvato
  put(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
}

export interface EvidenceRecordRepo {
  insert(rec: {
    scanMatchId: string;
    screenshotPath: string;
    htmlPath: string;
    whois: WhoisSummary;
    hash: string;
  }): Promise<string>;
}

export interface EvidenceDeps {
  storage: EvidenceStorage;
  repo: EvidenceRecordRepo;
  capture?: (url: string) => Promise<{ screenshot: Uint8Array; html: string }>;
  whois?: (host: string) => Promise<WhoisSummary>;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

export async function captureEvidence(input: EvidenceInput, deps: EvidenceDeps): Promise<EvidenceArtifacts> {
  const capture = deps.capture ?? (await import("./capture")).capturePage;
  const whois = deps.whois ?? rdapLookup;

  // Cattura la pagina ospitante se nota (piu' probante), altrimenti l'immagine.
  const target = input.pageUrl || input.sourceUrl;
  const { screenshot, html } = await capture(target);
  const hash = sha256(screenshot);

  const screenshotPath = await deps.storage.put(`${input.matchId}/screenshot.png`, screenshot, "image/png");
  const htmlPath = await deps.storage.put(`${input.matchId}/page.html`, new TextEncoder().encode(html), "text/html");
  const who = await whois(input.host);

  await deps.repo.insert({ scanMatchId: input.matchId, screenshotPath, htmlPath, whois: who, hash });
  return { screenshotPath, htmlPath, whois: who, hash };
}
