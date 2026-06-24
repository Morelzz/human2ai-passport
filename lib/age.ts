// lib/age.ts
// Calcolo età puro e fail-closed per l'age-gate 18+. Nessun IO, nessuna
// dipendenza: tutto testabile. Confronto fatto su componenti di data (anno/
// mese/giorno) per evitare slittamenti di fuso. La data di nascita arriva
// sempre come "YYYY-MM-DD".

// Anni pieni tra dob e now, oppure null se la data e' malformata, inesistente,
// futura o assurda (> 120 anni). Il null e' volutamente "non verificabile".
export function ageFromDob(dob: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // La data deve esistere davvero (scarta 2026-02-30, mese 13, ecc.).
  const probe = new Date(y, mo - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null;
  const ny = now.getFullYear();
  const nmo = now.getMonth() + 1;
  const nd = now.getDate();
  // Data futura: non valida.
  if (y > ny || (y === ny && (mo > nmo || (mo === nmo && d > nd)))) return null;
  let age = ny - y;
  if (nmo < mo || (nmo === mo && nd < d)) age -= 1;
  if (age > 120) return null;
  return age;
}

// Maggiorenne? Fail-closed: qualunque input non verificabile vale false.
export function isAdult(dob: string, now: Date): boolean {
  const age = ageFromDob(dob, now);
  return age !== null && age >= 18;
}

// Esito d'eta per lo strato forte (documento Didit): "unknown" quando la data
// non e' leggibile, cosi' il chiamante puo' distinguere "minore" da "non so".
export function kycAdultOutcome(dob: string | null, now: Date): "ok" | "under_18" | "unknown" {
  if (!dob) return "unknown";
  const age = ageFromDob(dob, now);
  if (age === null) return "unknown";
  return age >= 18 ? "ok" : "under_18";
}
