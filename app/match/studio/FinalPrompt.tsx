"use client";

// ──────────────────────────────────────────────────────────────────────────
// FinalPrompt — anteprima READ-ONLY del "Prompt finale". Ricompone, lato
// client e a sola lettura, gli stessi PEZZI che il server comporra in
// lib/echo-prompt.buildEchoPrompt, usando GLI STESSI token-helper e lo STESSO
// insieme di token di @/lib/studio-options:
//   - la scena tra virgolette (la direzione dell'utente),
//   - il token della posa (poseToken, saltato se vuoto),
//   - le clausole dei riferimenti (una breve per ref: ruolo + descrizione),
//   - il segmento fotografico (photographicSegment: stile colore, inquadratura,
//     espressione, macchina, ottica, luce),
//   - una nota muted: prefisso identita di sistema (lato server).
// ATTENZIONE all'ordine: l'anteprima mette la SCENA PER PRIMA come headline,
// scelta di leggibilita (UX). Il server invece la appende per ULTIMA, come
// "Additional direction: <scene>". La composizione e' fedele nel CONTENUTO
// (stessi token, stesso insieme); l'ordine di visualizzazione e' solo una
// scelta presentazionale, non rispecchia l'ordine del server.
// I token DOPO la scena sono de-enfatizzati in amber (come .add del prototipo).
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.finalp).
// NB testi italiani senza trattini lunghi (regola di Morelz).
// ──────────────────────────────────────────────────────────────────────────

import { poseToken, photographicSegment } from "@/lib/studio-options";
import type {
  FramingVal,
  ExpressionVal,
  LightVal,
  ColorStyleVal,
  LensVal,
  CameraVal,
} from "@/lib/studio-options";

// Riferimento immagine corrente (stessa forma degli echoRefs lato MatchClient).
type Ref = { dataUrl: string; desc: string; role: string } | undefined;

// Clausola breve per un riferimento: la descrizione dell'utente se c'e,
// altrimenti una frase generica per ruolo. Fedele "nello spirito" alla
// clausola che il server compone (lib/echo-prompt.clauseForExtra), che resta
// pero interna: qui basta una resa leggibile in italiano.
function refClause(role: string, desc: string): string {
  const d = (desc || "").trim();
  if (d) return d;
  const byRole: Record<string, string> = {
    outfit: "l'abbigliamento mostrato",
    accessorio: "l'accessorio mostrato",
    sfondo: "l'ambiente mostrato",
    oggetto: "l'oggetto mostrato",
  };
  return byRole[role] ?? "il riferimento mostrato";
}

export function FinalPrompt({
  scene,
  pose,
  framing,
  expression,
  colorStyle,
  camera,
  lens,
  light,
  refs,
}: {
  scene: string;
  pose: string;
  framing: FramingVal;
  expression: ExpressionVal;
  colorStyle: ColorStyleVal;
  camera: CameraVal;
  lens: LensVal;
  light: LightVal;
  refs: Ref[];
}) {
  // 2. posa (token whitelist, vuoto se "nessuna").
  const poseTok = poseToken(pose);
  // 3. clausole dei riferimenti (solo slot con immagine caricata).
  const refClauses = (refs ?? [])
    .filter((r): r is NonNullable<Ref> => !!r?.dataUrl)
    .map((r) => refClause(r.role, r.desc));
  // 4. segmento fotografico (stessa funzione del server).
  const photo = photographicSegment({ camera, lens, light, colorStyle, framing, expression });

  // Pezzi aggiuntivi, nell'ordine del server, de-enfatizzati in amber.
  const added = [poseTok, ...refClauses, photo].filter(Boolean).join(", ");
  const sceneText = (scene || "").trim();

  return (
    <div className="mt-5">
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">
        Prompt finale
      </span>
      <div className="break-words rounded-xl border border-dashed border-border bg-obsidian px-3 py-2.5 font-mono text-[0.66rem] leading-relaxed text-muted">
        <span>&quot;{sceneText}&quot;</span>
        {added && <span className="text-amber">, {added}</span>}
        <span className="mt-1.5 block text-[0.6rem] text-faint">
          + prefisso identita di sistema (dalle foto consensuali, lato server)
        </span>
      </div>
    </div>
  );
}
