// ──────────────────────────────────────────────────────────────────────────
// ECHO — quale modello OpenAI genera. Modulo PURO (niente fetch, niente chiavi).
//
// Il modello di default vive qui, nel codice, cosi' Vercel e il worker Railway
// usano sempre lo stesso senza configurare niente. ECHO_MODEL (env) serve solo
// come leva d'emergenza, per tornare indietro su un host senza toccare il codice:
// un valore sconosciuto o scritto male ricade sul default invece di far fallire
// le generazioni pagate.
// ──────────────────────────────────────────────────────────────────────────

export const ECHO_MODELS = ["gpt-image-2", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst"] as const;
export type EchoModel = (typeof ECHO_MODELS)[number];

export const ECHO_DEFAULT_MODEL: EchoModel = "gpt-image-2.5-flare";

export function isEchoModel(v: unknown): v is EchoModel {
  return typeof v === "string" && (ECHO_MODELS as readonly string[]).includes(v);
}

/** Il modello da usare: ECHO_MODEL se e' uno di quelli ammessi, altrimenti il default. */
export function echoModel(value: string | undefined = process.env.ECHO_MODEL): EchoModel {
  const v = value?.trim();
  return isEchoModel(v) ? v : ECHO_DEFAULT_MODEL;
}
