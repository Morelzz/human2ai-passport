// ──────────────────────────────────────────────────────────────────────────
// Dettatura vocale: logica PURA, niente DOM (testabile in node).
// La superficie Web Speech (riconoscimento) vive nell'hook client useDictation;
// qui stanno solo le funzioni che uniscono il testo e mappano gli errori.
// NB testi italiani senza trattini lunghi (regola di Morelz).
// ──────────────────────────────────────────────────────────────────────────

// Unisce il testo dettato a quello gia presente nel campo "scena", con una
// spaziatura sensata: niente doppi spazi, niente spazio prima della
// punteggiatura. Se l'aggiunta e' vuota la base resta intatta.
export function joinScene(base: string, addition: string): string {
  const a = base.trimEnd();
  const b = addition.trim();
  if (!b) return base;
  if (!a) return b;
  // L'aggiunta che inizia con punteggiatura si attacca senza spazio.
  if (/^[,.;:!?]/.test(b)) return a + b;
  return a + " " + b;
}

// Riduce una fetta di risultati del riconoscimento (gia' interim/final) nei due
// segmenti di testo: "final" = testo consolidato da appendere una volta sola,
// "interim" = anteprima dal vivo mentre l'utente parla. Entrambi ripuliti.
export function collectResults(
  results: Array<{ transcript: string; isFinal: boolean }>,
): { final: string; interim: string } {
  let final = "";
  let interim = "";
  for (const r of results) {
    if (r.isFinal) final += r.transcript;
    else interim += r.transcript;
  }
  return { final: final.trim(), interim: interim.trim() };
}

// Messaggio utente in italiano per i codici d'errore della Web Speech API.
// "aborted" e' uno stop volontario: nessun messaggio.
export function dictationError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microfono bloccato. Consenti l'accesso dalle impostazioni del browser.";
    case "no-speech":
      return "Non ho sentito nulla, riprova.";
    case "audio-capture":
      return "Nessun microfono trovato.";
    case "network":
      return "Serve connessione: la dettatura usa la rete.";
    case "aborted":
      return "";
    default:
      return "Dettatura non riuscita, riprova.";
  }
}
