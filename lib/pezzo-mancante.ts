// ──────────────────────────────────────────────────────────────────────────
// "IL PEZZO NON C'E' PIU'" (21/9/2026). Quando pubblichiamo una versione nuova,
// i file di codice della vecchia spariscono dal CDN. Una scheda rimasta aperta
// da prima, al primo clic prova a scaricare un pezzo che non esiste piu' e va
// in errore: l'utente vede "Questa pagina non e' partita" su una pagina che
// funziona benissimo, e deve indovinare da solo che basta ricaricare.
//
// Non e' un errore del programma, e' una pagina scaduta. Si riconosce e si
// ricarica da soli, UNA volta sola (il fermo in sessionStorage evita il
// carosello ricarica-errore-ricarica se il guasto fosse vero).
// Modulo PURO: la parte che decide si prova senza browser.
// ──────────────────────────────────────────────────────────────────────────

const SEGNI = [
  "chunkloaderror",
  "loading chunk",
  "failed to load chunk",
  "loading css chunk",
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  // quando il CDN, al posto del file, restituisce la pagina di errore in HTML
  "strict mime type",
  "is not executable",
  "is not a valid javascript mime type",
];

/** L'errore e' "la pagina e' scaduta", non "il programma e' rotto"? */
export function eUnPezzoMancante(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const testo = `${error.name ?? ""} ${error.message ?? ""}`.toLowerCase();
  return SEGNI.some((s) => testo.includes(s));
}

export const CHIAVE_RICARICA = "semblic:ricarica-pezzo";
const FINESTRA_MS = 30_000; // due errori uguali a meno di 30 s = non e' la pubblicazione

/**
 * Si puo' ricaricare adesso? Vero solo la prima volta entro la finestra: se la
 * pagina e' appena stata ricaricata per lo stesso motivo, si lascia stare e si
 * mostra l'errore, cosi' non si entra in un ciclo.
 */
export function possoRicaricare(adesso: number, ultima: string | null): boolean {
  if (!ultima) return true;
  const t = Number(ultima);
  if (!Number.isFinite(t)) return true;
  return adesso - t > FINESTRA_MS;
}
