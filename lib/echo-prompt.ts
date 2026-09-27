// lib/echo-prompt.ts
// ──────────────────────────────────────────────────────────────────────────
// Composizione del prompt finale ECHO. SORGENTE UNICA (prima duplicata tra
// app/api/generate/route.ts e lib/echo-job.ts). SERVER-ONLY ok ma puro: nessun
// import esterno. L'identita e garantita dalle reference, non dalle parole.
// ──────────────────────────────────────────────────────────────────────────

export type ExtraMeta = { role: string; desc: string };

// La scena si taglia qui. Era 600: il 27/9 una scena con la luce e i vestiti
// descritti bene (1046 caratteri) ha perso i vestiti per strada, e nessuno lo
// diceva al cliente. Il motore regge prompt molto piu' lunghi.
export const MAX_SCENA = 1500;

// Le foto di riferimento sono foto da studio: luce frontale e i vestiti del
// giorno della scansione. Il modello tendeva a copiarle (27/9: luce dura da
// destra chiesta, uscita piatta; vestiti chiesti, usciti quelli dello studio).
// Le foto dicono CHI e', non come e' illuminato ne' come e' vestito.
export const SOLO_IDENTITA =
  "The identity reference photographs define ONLY who the person is (face and hair). Do NOT copy their lighting, shadows, background, clothing, pose or camera angle: light direction, contrast, shadows on the face, clothes and setting come exclusively from the scene description, even if that leaves part of the face in deep shadow.";

function clauseForExtra(e: ExtraMeta): string {
  const d = e.desc.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  switch (e.role) {
    case "outfit":
      return `the person is wearing the ${d || "outfit"} shown in the additional reference images`;
    case "accessorio":
      return `the person is wearing or using the ${d || "accessory"} shown in the additional reference images`;
    case "serie":
      // La serie per le campagne (27/9): il primo scatto accettato fa da guida
      // agli altri, cosi' sembrano lo stesso servizio fotografico.
      return "this image belongs to the same photo shoot as the additional reference image: keep exactly the same outfit, hairstyle, lighting quality and colour grade, while the place, action and pose follow the scene description";
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
  const safe = scene.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_SCENA);
  let base =
    "Photorealistic image that preserves the exact facial identity, hair and distinctive features of the same real person shown in the reference photographs. Natural, true-to-life skin and proportions, high-quality commercial photography.";
  // Protagonisti e folla (19/9/2026): l'unico volto riconoscibile e' quello con
  // il consenso; chiunque altro resta sullo sfondo, piccolo e sfocato.
  base += " This person is the only recognizable face in the image: any other people stay in the background, small, out of focus and not recognizable.";
  base += ` ${SOLO_IDENTITA}`;
  if (identityText) base += ` ${identityText}`;
  if (poseText) base += ` The person's body pose: ${poseText}.`;
  const clauses = extras.map(clauseForExtra);
  if (clauses.length > 0) {
    base += " " + clauses.join("; ") + ". Apply each one faithfully and exactly as depicted.";
  }
  if (photographic) base += ` ${photographic}`;
  return safe ? `${base} Additional direction: ${safe}.` : base;
}
