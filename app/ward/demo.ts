// Dati DEMO della app Ward. I TIPI sono la fonte di verita': quando arriva il
// dato reale (scan engine), si sostituisce solo la sorgente, non i componenti.

export interface WardBlip { x: number; y: number; sev: "c" | "a" | "s"; }
export interface WardDetection { id: string; dom: string; score: number; band: "confirmed" | "review"; meta: string; }
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
    { id: "d1", dom: "unknown-host.ru", score: 94, band: "confirmed", meta: "AI-generated, nessun consenso" },
    { id: "d2", dom: "repost-board.net", score: 89, band: "confirmed", meta: "originale rubato" },
    { id: "d3", dom: "mirror-cdn.io", score: 86, band: "confirmed", meta: "AI-generated" },
    { id: "d4", dom: "ad-network.io", score: 58, band: "review", meta: "possibile, volto parziale" },
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
