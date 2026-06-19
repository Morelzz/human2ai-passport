// Dati DEMO della app Ward. I TIPI sono la fonte di verita': quando arriva il
// dato reale (scan engine), si sostituisce solo la sorgente, non i componenti.

export interface WardBlip { x: number; y: number; sev: "c" | "a" | "s"; }

export type Sensitivity = "standard" | "sensitive" | "minor";

export interface WardDetection {
  id: string;
  dom: string;
  score: number;
  band: "confirmed" | "review";
  meta: string;
  sensitivity: Sensitivity;
  // Dettaglio (per 'minor' NON va mai mostrato: vedi DetectionDetail).
  url: string;
  host: string;
  registrar: string;
  country: string;
  created: string;
  why: string;
  aiVerdict: string;
  hash: string;
  evidence: string[];
  reportRef?: string; // solo 'minor' (riferimento segnalazione autorita')
}

export interface WardOp { id: string; dom: string; meta: string; status: "pending" | "removed" | "legal"; }
export interface WardEvidence { id: string; dom: string; score: number; hash: string; anchoredAt: string; tags: string[]; }

export interface WardData {
  identity: { handle: string; consent: "active" | "expired" | "revoked"; coreId: string };
  status: "protected" | "at_risk";
  lastSweep: string;
  nextScan: string;
  stats: { confirmed: number; review: number; cleared: number };
  blips: WardBlip[];
  nemesis: { landed: number; inProgress: number; escalated: number };
  detections: WardDetection[];
  ops: WardOp[];
  vault: WardEvidence[];
}

// Helper per non ripetere i campi dettaglio negli esempi standard.
function std(p: {
  id: string; dom: string; score: number; band: "confirmed" | "review"; meta: string;
  registrar: string; country: string; created: string; why: string; aiVerdict: string; hash: string; evidence: string[];
}): WardDetection {
  return {
    ...p, sensitivity: "standard",
    url: `cdn.${p.dom}/img/${p.id}.jpg`, host: p.dom,
  };
}

export const DEMO_WARD: WardData = {
  identity: { handle: "Ward-003", consent: "active", coreId: "0xA7F3" },
  status: "protected",
  lastSweep: "2 min fa",
  nextScan: "tra 6 h",
  stats: { confirmed: 3, review: 2, cleared: 209 },
  blips: [
    { x: 72, y: 32, sev: "c" }, { x: 60, y: 68, sev: "c" }, { x: 34, y: 42, sev: "c" },
    { x: 50, y: 24, sev: "a" }, { x: 30, y: 60, sev: "a" },
    { x: 78, y: 54, sev: "s" }, { x: 44, y: 78, sev: "s" }, { x: 24, y: 48, sev: "s" },
  ],
  nemesis: { landed: 14, inProgress: 3, escalated: 1 },
  detections: [
    std({ id: "d1", dom: "unknown-host.ru", score: 94, band: "confirmed", meta: "AI-generated, nessun consenso",
      registrar: "Ned-Host LLC", country: "RU", created: "2025-11-02",
      why: "94% di match facciale col tuo riferimento. Alta confidenza su un primo piano frontale nitido.",
      aiVerdict: "Probabile AI-generated", hash: "0x9f3c...a71e", evidence: ["screenshot", "html snapshot", "WHOIS", "AI-flag"] }),
    std({ id: "d2", dom: "repost-board.net", score: 89, band: "confirmed", meta: "originale rubato",
      registrar: "Privacy-Guard Ltd", country: "—", created: "2026-01-18",
      why: "89% di match facciale. Ripubblicazione di una tua immagine originale.",
      aiVerdict: "Probabile reale (ricaricata)", hash: "0x2b80...f44c", evidence: ["screenshot", "html snapshot", "WHOIS"] }),
    std({ id: "d3", dom: "mirror-cdn.io", score: 86, band: "confirmed", meta: "AI-generated",
      registrar: "CloudMirror Inc", country: "US", created: "2025-09-30",
      why: "86% di match facciale su un volto generato.",
      aiVerdict: "Probabile AI-generated", hash: "0x71aa...0d2f", evidence: ["screenshot", "html snapshot", "WHOIS", "AI-flag"] }),
    std({ id: "d4", dom: "ad-network.io", score: 58, band: "review", meta: "possibile, volto parziale",
      registrar: "AdNet S.A.", country: "NL", created: "2024-07-12",
      why: "58% di match: volto parziale o di profilo, sotto la soglia di certezza. Da rivedere.",
      aiVerdict: "Incerto", hash: "0x33cd...91be", evidence: ["screenshot", "WHOIS"] }),
    // CASO SENSIBILE: host classificato esplicito, preview sfocata di default.
    {
      id: "d5", dom: "anon-board.xx", score: 91, band: "confirmed", meta: "non autorizzato, sensibile",
      sensitivity: "sensitive",
      url: "[nascosto fino al reveal]", host: "anon-board.xx",
      registrar: "Privacy-Guard Ltd", country: "—", created: "2026-03-14",
      why: "91% di match facciale. La pagina host e' classificata come esplicita, quindi la preview e' nascosta di default.",
      aiVerdict: "Probabile AI-generated", hash: "0x4d11...c802", evidence: ["screenshot", "html snapshot", "WHOIS"],
    },
    // CASO MINORE: mai mostrato, mai salvato nel vault, instradato alle autorita'.
    {
      id: "d6", dom: "[host riservato]", score: 0, band: "confirmed", meta: "bloccato, instradato alle autorita'",
      sensitivity: "minor",
      url: "[riservato]", host: "[riservato]", registrar: "", country: "", created: "",
      why: "", aiVerdict: "", hash: "", evidence: [],
      reportRef: "NCMEC-2026-0619-7741",
    },
  ],
  ops: [
    { id: "o1", dom: "leak-forum.cc", meta: "DMCA + GDPR inviati, 3 giorni fa", status: "pending" },
    { id: "o2", dom: "deepfake-host.to", meta: "controdeduzione, con legale", status: "legal" },
    { id: "o3", dom: "old-blog.net", meta: "contenuto rimosso, 1 settimana fa", status: "removed" },
  ],
  vault: [
    { id: "v1", dom: "unknown-host.ru", score: 94, hash: "0x9f3c...a71e", anchoredAt: "2026-06-19", tags: ["screenshot", "html snapshot", "WHOIS", "AI-flag"] },
    { id: "v2", dom: "repost-board.net", score: 89, hash: "0x2b80...f44c", anchoredAt: "2026-06-19", tags: ["screenshot", "html snapshot", "WHOIS"] },
  ],
};
