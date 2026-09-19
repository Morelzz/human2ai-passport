// Chi e' operatore di Semblic (moderazione, KYC, messaggi del sito, VOLT...):
// chi ha il ruolo "admin" OPPURE un'email nella lista SEMBLIC_OPERATORI
// (variabile d'ambiente del SERVER, email separate da virgola).
// La lista serve a chi nel registro e' gia' altro, per esempio un venditore con
// la verifica approvata, e deve anche moderare senza perdere il suo ruolo: il
// campo profiles.role e' uno solo e decide anche avatar e cruscotto.
// L'email e' quella dell'account (auth), non un campo modificabile del profilo.

export function listaOperatori(env: string | undefined = process.env.SEMBLIC_OPERATORI): Set<string> {
  return new Set((env ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

export function eOperatore(role: string | null | undefined, email: string | null | undefined, lista: Set<string> = listaOperatori()): boolean {
  if (role === "admin") return true;
  return Boolean(email && lista.has(email.trim().toLowerCase()));
}
