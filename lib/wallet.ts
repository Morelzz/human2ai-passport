// Parametri economici (Regola d'oro R5: royalty ad accumulo, payout a soglia).
export const ROYALTY_PER_GEN_CENTS = 250;      // 2,50 € accreditati per generazione
export const PAYOUT_THRESHOLD_CENTS = 5000;    // payout possibile da 50 € in su

export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
