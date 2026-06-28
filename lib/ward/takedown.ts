import type { WhoisSummary } from "./evidence/whois";

// Core puro di Nemesis (rimozione DMCA assistita), fase 2 di Ward v2. Nessuna I/O:
// assembla la notice, governa lo stato del takedown, interpreta il ricontrollo
// dell'URL. Semblic PREPARA, l'utente invia: qui non si manda niente.

export type TakedownStatus = "drafted" | "sent" | "removed" | "online";
export type TakedownEvent = "send" | "recheck-gone" | "recheck-online";

export interface DmcaInput {
  claimant: { fullName: string; address: string; email: string };
  copy: { pageUrl: string | null; sourceUrl: string; host: string | null };
  work: { alias: string; certificate: string | null; verifyUrl: string | null; phash: string | null; generatedAt: string | null };
  abuse: Pick<WhoisSummary, "domain" | "registrar" | "source"> | null;
}

export interface DmcaNotice {
  to: string;
  subject: string;
  body: string;
  claimant: DmcaInput["claimant"];
  infringingUrl: string;
  originalWork: DmcaInput["work"];
}

// Notice DMCA in inglese (standard per gli host internazionali). Una sola fonte di
// verita' del testo: la usano sia l'anteprima UI sia il PDF lato client.
export function buildDmcaNotice(input: DmcaInput): DmcaNotice {
  const infringingUrl = input.copy.pageUrl || input.copy.sourceUrl;
  const to = input.abuse?.domain ? `abuse@${input.abuse.domain}` : "(abuse contact non disponibile)";
  const subject = `DMCA Takedown Notice - ${input.copy.host ?? infringingUrl}`;
  const lines = [
    "DMCA TAKEDOWN NOTICE",
    "",
    `To: ${to}` + (input.abuse?.registrar ? ` (registrar: ${input.abuse.registrar})` : ""),
    "",
    "I am the owner of the copyrighted work described below, and I have a good faith",
    "belief that the use of the material in the manner complained of is not authorized",
    "by me, my agent, or the law.",
    "",
    "1. Copyrighted work:",
    `   Title: ${input.work.alias}`,
    input.work.certificate ? `   Authenticity certificate: ${input.work.certificate}` : "",
    input.work.verifyUrl ? `   Verify: ${input.work.verifyUrl}` : "",
    input.work.phash ? `   Perceptual hash: ${input.work.phash}` : "",
    input.work.generatedAt ? `   Created on: ${input.work.generatedAt}` : "",
    "",
    "2. Infringing material to be removed:",
    `   ${infringingUrl}`,
    input.copy.host ? `   Host: ${input.copy.host}` : "",
    "",
    "3. My contact information:",
    `   ${input.claimant.fullName}`,
    `   ${input.claimant.address}`,
    `   ${input.claimant.email}`,
    "",
    "I swear, under penalty of perjury, that the information in this notification is",
    "accurate and that I am the copyright owner or am authorized to act on behalf of",
    "the owner of an exclusive right that is allegedly infringed.",
    "",
    `Signature: ${input.claimant.fullName}`,
  ];
  const body = lines.filter((l) => l !== "").join("\n");
  return { to, subject, body, claimant: input.claimant, infringingUrl, originalWork: input.work };
}

// Macchina a stati: bozza -> inviata -> (rimossa | ancora online). Si puo'
// ricontrollare piu' volte. Ogni transizione fuori schema lancia (guardia esplicita).
export function nextTakedownStatus(current: TakedownStatus, event: TakedownEvent): TakedownStatus {
  if (current === "drafted" && event === "send") return "sent";
  if ((current === "sent" || current === "online") && event === "recheck-gone") return "removed";
  if ((current === "sent" || current === "online") && event === "recheck-online") return "online";
  throw new Error(`transizione non valida: ${current} + ${event}`);
}

// 404/410/irraggiungibile = la copia non c'e' piu'. Tutto il resto = prudenza:
// non dichiariamo rimosso senza certezza, resta "online".
export function classifyRecheck(httpStatus: number | null): "gone" | "online" {
  if (httpStatus === null || httpStatus === 404 || httpStatus === 410) return "gone";
  return "online";
}
