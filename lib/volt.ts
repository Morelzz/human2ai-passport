import { createServerClient } from "@/lib/supabase";

// Sistema VOLT: crediti prepagati di HUMAN2AI (da VOLT_SYSTEM.md).
// 1 VOLT = 1 centesimo di euro. I VOLT si spendono, gli euro si guadagnano:
// le royalty dei seller restano in euro e non passano MAI da qui.

export const VOLT_PER_EURO = 100;

// Soglia "saldo basso" configurabile da env (VOLT_SYSTEM §6.4).
export const LOW_BALANCE_THRESHOLD = Number(process.env.VOLT_LOW_THRESHOLD ?? 50);

// Bonus di benvenuto: ATTIVO (decisione Morelz 2026-06-12), accreditato alla
// verifica KYC dell'account, una sola volta (ref 'welcome' = idempotenza).
export const WELCOME_VOLT = 50;
export const WELCOME_REF = "welcome";

export type VoltPack = {
  id: string;
  name: string;
  volt: number; // VOLT base del pacchetto
  bonus: number; // VOLT regalo sopra il prezzo
  priceCents: number; // prezzo in centesimi (= volt, col cambio 1:1)
  note?: string;
  popular?: boolean;
};

// Pacchetti a scala di energia (VOLT_SYSTEM §3, prezzi confermati 2026-06-12).
export const VOLT_PACKS: VoltPack[] = [
  { id: "scintilla", name: "SCINTILLA", volt: 100, bonus: 0, priceCents: 100, note: "Per iniziare" },
  { id: "impulso", name: "IMPULSO", volt: 500, bonus: 25, priceCents: 500, popular: true },
  { id: "scarica", name: "SCARICA", volt: 1200, bonus: 120, priceCents: 1200 },
  { id: "alta-tensione", name: "ALTA TENSIONE", volt: 2500, bonus: 375, priceCents: 2500, note: "Per studi e agenzie" },
];

export type VoltTxType = "recharge" | "generation" | "bonus" | "refund" | "admin_grant";

export type VoltTransaction = {
  id: string;
  type: VoltTxType;
  delta_volt: number;
  balance_after: number;
  ref: string | null;
  created_at: string;
};

// Saldo corrente. null = sistema non configurato (migrazione volt.sql non
// applicata): le UI degradano senza rompersi.
export async function voltBalance(userId: string): Promise<number | null> {
  const admin = createServerClient();
  const { data, error } = await admin.rpc("volt_balance", { p_user: userId });
  if (error) return null;
  return typeof data === "number" ? data : 0;
}

// Spesa atomica (lock per utente nel DB). Esiti:
//  { ok: true, balance }  spesa registrata
//  { ok: false, reason: "insufficient", balance }  saldo non basta
//  { ok: false, reason: "unconfigured" }  migrazione assente o errore
export async function spendVolt(
  userId: string,
  amount: number,
  ref: string
): Promise<{ ok: true; balance: number } | { ok: false; reason: "insufficient" | "unconfigured"; balance?: number }> {
  const admin = createServerClient();
  const { data, error } = await admin.rpc("spend_volt", {
    p_user: userId,
    p_amount: amount,
    p_ref: ref,
  });
  if (error) return { ok: false, reason: "unconfigured" };
  if (typeof data !== "number" || data < 0) {
    const balance = await voltBalance(userId);
    return { ok: false, reason: "insufficient", balance: balance ?? 0 };
  }
  return { ok: true, balance: data };
}

// Accredito atomico (ricarica, bonus, storno, accredito admin).
export async function grantVolt(
  userId: string,
  amount: number,
  type: Exclude<VoltTxType, "generation">,
  ref: string
): Promise<number | null> {
  const admin = createServerClient();
  const { data, error } = await admin.rpc("grant_volt", {
    p_user: userId,
    p_amount: amount,
    p_type: type,
    p_ref: ref,
  });
  if (error || typeof data !== "number" || data < 0) return null;
  return data;
}

// Ultimi movimenti per dropdown/storico.
export async function voltTransactions(userId: string, limit = 5): Promise<VoltTransaction[]> {
  const admin = createServerClient();
  const { data, error } = await admin
    .from("volt_transactions")
    .select("id, type, delta_volt, balance_after, ref, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as VoltTransaction[];
}

// Bonus di benvenuto idempotente. La garanzia vera è a livello DB: grant_volt è
// no-op su un (user,'bonus','welcome') già presente (controllo dentro l'advisory
// lock) più l'unique index volt_tx_idem (vedi supabase/volt_idempotency.sql).
// Questo pre-check è solo un fast-path che restituisce il booleano accurato: anche
// con doppio click admin o retry non si accredita due volte.
export async function grantWelcomeVoltOnce(userId: string): Promise<boolean> {
  const admin = createServerClient();
  const { count, error } = await admin
    .from("volt_transactions")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("type", "bonus")
    .eq("ref", WELCOME_REF);
  if (error) return false; // sistema non configurato: nessun bonus, nessun crash
  if ((count ?? 0) > 0) return false; // già ricevuto
  const balance = await grantVolt(userId, WELCOME_VOLT, "bonus", WELCOME_REF);
  return balance !== null;
}
