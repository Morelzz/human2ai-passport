// Dizionario stringhe del sistema VOLT (da VOLT_SYSTEM.md §4).
// Chiavi i18n-ready: italiano ora, inglese in futuro. Le interfacce NON
// scrivono mai testo VOLT inline: passano sempre da qui.
// Regole di linguaggio: VOLT maiuscolo e invariabile; mai "token/moneta/
// valuta/coin"; metafore elettriche leggere; niente trattini lunghi nei testi.

export const VOLT_STRINGS = {
  // 4.1 Header e tooltip
  "volt.badge.cta": "Ricarica",
  "volt.tooltip.what":
    "I VOLT sono i crediti di SEMBLIC: alimentano ogni generazione e garantiscono che dietro ogni volto ci sia una persona consenziente e pagata.",
  "volt.low.tooltip": "Batteria quasi scarica: ti restano {n} ⚡.",
  "volt.zero.tooltip": "Energia esaurita. Ricarica per continuare a generare.",

  // 4.2 Pagina di ricarica
  "recharge.title": "Fai il pieno di energia",
  "recharge.subtitle":
    "Ogni VOLT alimenta una generazione con una persona vera dietro: consenziente, identificata, pagata.",
  "recharge.packs.popular": "Il più scelto",
  "recharge.legal.microline":
    "I VOLT sono crediti prepagati per i servizi SEMBLIC. Si applicano i Termini.",
  "recharge.cta": "Ricarica {n} ⚡ · € {prezzo}",
  "recharge.soon": "Il pagamento online arriva a breve. Intanto scrivici: ti accreditiamo noi.",

  // 4.3 Conferma ricarica
  "recharge.success.title": "Sei carico.",
  "recharge.success.body": "+{n} ⚡ accreditati. Saldo: {saldo} ⚡.",
  "recharge.success.mission":
    "La tua energia tiene in piedi un'economia di persone reali. Grazie.",

  // 4.4 Pre-generazione
  "gen.cost.preview": "Questa generazione costa {n} ⚡ · Saldo dopo: {saldo} ⚡",
  "gen.cta": "Genera (−{n} ⚡)",
  "gen.cost.tier.tooltip":
    "I costi variano per livello: SPARK è la scintilla, HUMAN è l'alta tensione.",

  // 4.5 Loading (rotazione casuale)
  "gen.loading.1": "Tensione in salita…",
  "gen.loading.2": "Stiamo dando corrente al tuo prompt…",
  "gen.loading.3": "Corrente stabile, generazione in corso…",
  "gen.loading.4": "Alessandro Volta approverebbe…",
  "gen.loading.5": "Il Gate di Consenso ha dato il via libera. Si genera…",

  // 4.6 Post-generazione
  "gen.success.body": "Fatto. −{n} ⚡ · Saldo: {saldo} ⚡",
  "gen.success.mission.1": "Ogni VOLT speso ha pagato una persona reale.",
  "gen.success.mission.2": "Dietro questo output c'è un nome, non un dataset.",
  "gen.success.mission.3": "Royalty in viaggio verso {nome_avatar}.",

  // 4.7 Saldo insufficiente (mai punitivo)
  "volt.insufficient.title": "Ti manca un po' di energia",
  "volt.insufficient.body":
    "Per questa generazione servono {n} ⚡, te ne mancano {delta}. Ricarica e riparti da dove eri.",
  "volt.insufficient.cta": "Ricarica ora",
  "volt.insufficient.secondary": "Scegli un livello più leggero",

  // 4.8 Saldo basso (nudge, max 1 per sessione)
  "volt.low.banner":
    "Meno di {soglia} ⚡ nel serbatoio. Una ricarica adesso e non ti fermi sul più bello.",

  // 4.9 Storico
  "history.title": "Movimenti VOLT",
  "history.empty": "Ancora nessuna scintilla. La tua prima generazione ti aspetta.",
  "history.row.gen": "Generazione {tier} · −{n} ⚡",
  "history.row.recharge": "Ricarica · +{n} ⚡",
  "history.row.bonus": "Bonus di benvenuto · +{n} ⚡",
  "history.row.refund": "Storno generazione · +{n} ⚡",
  "history.row.admin_grant": "Accredito SEMBLIC · +{n} ⚡",

  // 4.10 Errori di pagamento
  "payment.error.body":
    "Il pagamento non è andato a buon fine. Nessun VOLT addebitato. Riprova o cambia metodo.",
  "payment.error.cta": "Riprova",

  // 4.11 Bonus di benvenuto (ATTIVO, decisione 2026-06-12)
  "volt.welcome":
    "Benvenuto su SEMBLIC. I primi 50 ⚡ li offriamo noi: la prima scintilla è gratis.",

  // 4.12 Area seller
  "seller.volt.title": "I tuoi VOLT",
  "seller.volt.body":
    "Vuoi vedere il tuo avatar in azione? Genera con i tuoi VOLT, come farebbe un cliente.",
  "seller.earnings.title": "Guadagni",
  "seller.earnings.body":
    "Le tue royalty viaggiano in euro veri, direttamente sul tuo conto. I VOLT servono a generare, i guadagni restano in €.",

  // 4.13 Email / notifiche (infrastruttura email futura)
  "email.recharge.subject": "Ricarica completata: +{n} ⚡",
  "email.low.subject": "Sei quasi a secco di VOLT",
  "email.low.body":
    "Ti restano {n} ⚡. Ricarica in 30 secondi e continua a generare: {link}",

  // Storno automatico su generazione fallita (§6.3)
  "gen.refund.toast": "Generazione non riuscita. {n} ⚡ riaccreditati.",
} as const;

export type VoltStringKey = keyof typeof VOLT_STRINGS;

// Interpolazione semplice: voltStr("gen.cta", { n: 48 }) → "Genera (−48 ⚡)"
export function voltStr(key: VoltStringKey, vars: Record<string, string | number> = {}): string {
  let out: string = VOLT_STRINGS[key];
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

// Riga di loading casuale (4.5) e missione post-generazione (4.6, 1 su 3).
export function voltLoadingLine(): string {
  const i = 1 + Math.floor(Math.random() * 5);
  return VOLT_STRINGS[`gen.loading.${i}` as VoltStringKey];
}

export function voltSuccessMission(avatarAlias: string): string | null {
  if (Math.random() > 1 / 3) return null;
  const i = 1 + Math.floor(Math.random() * 3);
  return voltStr(`gen.success.mission.${i}` as VoltStringKey, { nome_avatar: avatarAlias });
}
