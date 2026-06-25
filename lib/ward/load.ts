import type { WardData, WardDetection, WardOp, WardEvidence, WardBlip } from "../../app/ward/demo";
import type { ConsentStatus } from "./consent";

// Mapper PURO: dalle righe reali (scan_matches/jobs/nemesis/evidence + avatar +
// consenso) costruisce la stessa WardData che oggi alimenta la UI demo. Nessun
// IO qui (l'IO sta in load-server.ts): cosi e' testabile e deterministico.
// Child-safety: i match 'minor' non rivelano MAI host/url/dettagli, e non
// entrano nel Vault dell'utente.

export interface WardLoadMatch {
  id: string;
  source_url: string;
  page_url?: string | null;
  host: string | null;
  score: number | null;
  band: "confirmed" | "review";
  sensitivity: "standard" | "sensitive" | "minor";
  phash: string | null;
  ai_verdict: string | null;
  created_at: string;
}

export interface WardLoadInput {
  avatar: { id: string; handle: string };
  consentStatus: ConsentStatus;
  jobs: { finished_at: string | null; stats: { discarded?: number } | null }[];
  matches: WardLoadMatch[];
  nemesis: { id: string; scan_match_id: string; kind: string; status: string }[];
  evidence: {
    id: string;
    scan_match_id: string;
    hash: string | null;
    anchored_at: string | null;
    created_at: string;
    whois: { registrar?: string | null; domain?: string | null } | null;
  }[];
  nowIso: string;
}

const day = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");

// Tempo relativo, puro (nessun Date.now: il "now" si passa).
function relativeTime(iso: string | null, nowIso: string): string {
  if (!iso) return "mai";
  const diff = new Date(nowIso).getTime() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "ora";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ora";
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h fa`;
  return `${Math.floor(h / 24)} g fa`;
}

function coreIdFrom(avatarId: string): string {
  return "0x" + avatarId.replace(/-/g, "").slice(0, 4).toUpperCase();
}

// Posizione deterministica del blip sul radar (angolo aureo, raggio 20-42%).
function blipPos(i: number): { x: number; y: number } {
  const angle = (i * 137.5 * Math.PI) / 180;
  const radius = 20 + (i % 3) * 9;
  const clamp = (v: number) => Math.max(4, Math.min(96, Math.round(v)));
  return { x: clamp(50 + radius * Math.cos(angle)), y: clamp(50 + radius * Math.sin(angle)) };
}

function evidenceTags(hasEvidence: boolean, aiVerdict: string | null): string[] {
  if (!hasEvidence) return [];
  const tags = ["screenshot", "html snapshot", "WHOIS"];
  if (aiVerdict) tags.push("AI-flag");
  return tags;
}

function whyText(score: number, band: "confirmed" | "review"): string {
  if (band === "review") {
    return `${score}% di match: volto parziale o di profilo, sotto la soglia di certezza. Da rivedere.`;
  }
  return `${score}% di match facciale col tuo riferimento.`;
}

export function buildWardData(input: WardLoadInput): WardData {
  const { avatar, consentStatus, jobs, matches, nemesis, evidence, nowIso } = input;

  const consent: "active" | "expired" | "revoked" =
    consentStatus === "active" ? "active" : consentStatus === "expired" ? "expired" : "revoked";

  // indici per i join
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const evidenceByMatch = new Map(evidence.map((e) => [e.scan_match_id, e]));

  const confirmed = matches.filter((m) => m.band === "confirmed").length;
  const review = matches.filter((m) => m.band === "review").length;
  const cleared = jobs.reduce((s, j) => s + (j.stats?.discarded ?? 0), 0);

  const lastFinished = jobs
    .map((j) => j.finished_at)
    .filter((f): f is string => !!f)
    .sort()
    .at(-1) ?? null;

  const blips: WardBlip[] = matches.map((m, i) => ({
    ...blipPos(i),
    sev: m.band === "confirmed" ? "c" : "a",
  }));

  const detections: WardDetection[] = matches.map((m) => {
    const ev = evidenceByMatch.get(m.id);
    if (m.sensitivity === "minor") {
      // Child-safety: niente host/url/dettagli, mai.
      return {
        id: m.id, dom: "[host riservato]", score: 0, band: "confirmed",
        meta: "bloccato, instradato alle autorita'", sensitivity: "minor",
        url: "[riservato]", host: "[riservato]", registrar: "", country: "", created: "",
        why: "", aiVerdict: "", hash: "", evidence: [],
      };
    }
    const sensitive = m.sensitivity === "sensitive";
    return {
      id: m.id,
      dom: m.host ?? "(host sconosciuto)",
      score: m.score ?? 0,
      band: m.band,
      meta: m.band === "confirmed" ? "non autorizzato" : "possibile, da rivedere",
      sensitivity: m.sensitivity,
      url: sensitive ? "[nascosto fino al reveal]" : m.source_url,
      // pageUrl: link alla pagina ospitante. Nascosto per i sensibili (come l'url):
      // si rivela col reveal lato UI; l'anteprima immagine passa comunque dal proxy
      // per id, quindi non dipende da questo campo.
      pageUrl: sensitive ? undefined : (m.page_url ?? undefined),
      host: m.host ?? "",
      registrar: ev?.whois?.registrar ?? "",
      country: "",
      created: day(m.created_at),
      why: whyText(m.score ?? 0, m.band),
      aiVerdict: m.ai_verdict ?? "",
      hash: m.phash ?? "",
      evidence: evidenceTags(!!ev, m.ai_verdict),
    };
  });

  const opStatus = (s: string): WardOp["status"] =>
    s === "removed" ? "removed" : s === "legal" || s === "escalated" ? "legal" : "pending";

  const ops: WardOp[] = nemesis.map((n) => {
    const m = matchById.get(n.scan_match_id);
    const minor = m?.sensitivity === "minor";
    return {
      id: n.id,
      dom: minor ? "[riservato]" : m?.host ?? "(host sconosciuto)",
      meta: `${n.kind.toUpperCase()} ${n.status}`,
      status: opStatus(n.status),
    };
  });

  const nemesisCounts = {
    landed: nemesis.filter((n) => n.status === "removed").length,
    inProgress: nemesis.filter((n) => ["drafted", "sent", "host_pending"].includes(n.status)).length,
    escalated: nemesis.filter((n) => ["legal", "escalated"].includes(n.status)).length,
  };

  // Vault: i minori NON entrano mai nel vault dell'utente.
  const vault: WardEvidence[] = evidence
    .map((e) => ({ e, m: matchById.get(e.scan_match_id) }))
    .filter(({ m }) => m && m.sensitivity !== "minor")
    .map(({ e, m }) => ({
      id: e.id,
      dom: m!.host ?? "(host sconosciuto)",
      score: m!.score ?? 0,
      hash: e.hash ?? "",
      anchoredAt: day(e.anchored_at ?? e.created_at),
      tags: evidenceTags(true, m!.ai_verdict),
    }));

  return {
    identity: { handle: avatar.handle, consent, coreId: coreIdFrom(avatar.id) },
    status: consentStatus === "active" ? "protected" : "at_risk",
    lastSweep: relativeTime(lastFinished, nowIso),
    nextScan: "—",
    stats: { confirmed, review, cleared },
    blips,
    nemesis: nemesisCounts,
    detections,
    ops,
    vault,
  };
}
