// lib/echo-prompt.ts
// ──────────────────────────────────────────────────────────────────────────
// Composizione del prompt finale ECHO. SORGENTE UNICA (prima duplicata tra
// app/api/generate/route.ts e lib/echo-job.ts). SERVER-ONLY ok ma puro: nessun
// import esterno. L'identita e garantita dalle reference, non dalle parole.
// ──────────────────────────────────────────────────────────────────────────

export type ExtraMeta = { role: string; desc: string };

export function clauseForExtra(e: ExtraMeta): string {
  const d = e.desc.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  switch (e.role) {
    case "outfit":
      return `the person is wearing the ${d || "outfit"} shown in the additional reference images`;
    case "accessorio":
      return `the person is wearing or using the ${d || "accessory"} shown in the additional reference images`;
    case "sfondo":
      return `the scene takes place in the ${d || "location"} shown in the additional reference images, used as the background and environment`;
    default:
      return `the image includes the ${d || "object"} shown in the additional reference images`;
  }
}

// Ordine: identita -> posa -> extra (clausole) -> segmento fotografico -> scena.
// `photographic` arriva gia composto da lib/studio-options.photographicSegment
// (whitelist server), oppure stringa vuota.
export function buildEchoPrompt(
  scene: string,
  extras: ExtraMeta[],
  poseText?: string | null,
  identityText?: string | null,
  photographic?: string | null
): string {
  const safe = scene.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  let base =
    "Photorealistic image that preserves the exact facial identity, hair and distinctive features of the same real person shown in the reference photographs. Natural, true-to-life skin and proportions, high-quality commercial photography.";
  if (identityText) base += ` ${identityText}`;
  if (poseText) base += ` The person's body pose: ${poseText}.`;
  const clauses = extras.map(clauseForExtra);
  if (clauses.length > 0) {
    base += " " + clauses.join("; ") + ". Apply each one faithfully and exactly as depicted.";
  }
  if (photographic) base += ` ${photographic}`;
  return safe ? `${base} Additional direction: ${safe}.` : base;
}
