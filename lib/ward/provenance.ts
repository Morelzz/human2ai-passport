// Tag di provenienza: trasforma l'esito del decode della filigrana (il
// certificato estratto, o null se illeggibile) in un tag NEUTRO. "ours: true"
// significa "e' quasi certo nostra, certificato X"; "false" significa solo "non
// confermata dalla filigrana" (puo' essere una copia editata che l'ha persa,
// non un giudizio sull'autore). La decodifica vera la fa lib/watermark a monte.
export function provenanceTag(certificate: string | null): { ours: boolean; certificate: string | null } {
  const c = (certificate ?? "").trim();
  return c ? { ours: true, certificate: c } : { ours: false, certificate: null };
}
