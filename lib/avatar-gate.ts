// VETO sullo stato dell'avatar: condizioni che vietano in modo ASSOLUTO sia la
// generazione (/api/generate) sia l'attivazione del Soul (/api/avatar/soul), a
// prescindere dalla categoria d'uso. Fonte unica condivisa dai due percorsi:
// finché entrambi passano da qui, non possono divergere sui veti (stesso motivo
// per cui gli oggetti del form vivono in lib/contact.ts).
//
// I valori di ritorno coincidono con le "reason" del Transparency Report
// (lib/blocked), così il chiamante può loggarli direttamente.

export type AvatarVetoState = {
  protection_only?: boolean | null;
  revoked_at?: string | null;
};

export type AvatarVeto = "protected_face" | "revoked";

// Motivo del veto, o null se l'avatar è attivo e usabile.
// L'ordine (protezione prima della revoca) è quello storico di /api/generate.
export function avatarVetoReason(avatar: AvatarVetoState): AvatarVeto | null {
  if (avatar.protection_only) return "protected_face";
  if (avatar.revoked_at) return "revoked";
  return null;
}
