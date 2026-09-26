// ──────────────────────────────────────────────────────────────────────────
// JSON-LD SENZA SORPRESE (27/9/2026). I dati strutturati vanno dentro un
// <script type="application/ld+json">, e JSON.stringify NON scappa "<": un nome
// come `Anna</script><script src=...>` chiudeva lo script e ne apriva un altro
// sul passaporto pubblico (XSS salvato). Qui si scappano i caratteri che
// possono uscire dal tag o spezzare il JavaScript: il JSON resta identico per
// chi lo legge (Google compreso).
// ──────────────────────────────────────────────────────────────────────────

// I due separatori di riga Unicode, scritti per codice: letterali nel sorgente
// spezzerebbero la riga stessa.
const SEP_RIGA = String.fromCharCode(0x2028);
const SEP_PARAGRAFO = String.fromCharCode(0x2029);

export function jsonLdSicuro(dati: unknown): string {
  return JSON.stringify(dati)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(SEP_RIGA).join("\\u2028")
    .split(SEP_PARAGRAFO).join("\\u2029");
}
