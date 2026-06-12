# Spec: VOLT, ridisegno Account, CTA "Genera con questo avatar"

> Esito del brainstorming con Morelz del 2026-06-12. Tre moduli, da costruire
> in quest'ordine: VOLT (fase A), ridisegno Account, CTA dal catalogo.
> Regole solite: un modulo = una sessione + un commit, push solo a conferma.

## Modulo 1: VOLT, il credito interno (fase A, senza Stripe)

**Nome scelto da Morelz: VOLT** (da VOLTo + energia: "ricarica i tuoi Volt").
**Cambio: 1 VOLT = 1 centesimo di euro.** 10 euro = 1.000 VOLT.

**Principio legale (da validare con l'avvocato, non blocca la build):** il VOLT
è un buono prepagato chiuso: si compra, si spende solo dentro Human2AI, non si
trasferisce tra utenti, non si riconverte in euro. Niente blockchain: è un saldo
nel DB. La royalty alla persona resta in EURO (80/20 sul valore categoria,
invariata): i VOLT sono solo il lato compratore.

### Dati
Migrazione `supabase/volt.sql` (additiva):
- Tabella `volt_transactions` append-only: `id`, `user_id`, `delta_volt`
  (intero, positivo = accredito, negativo = spesa), `reason`
  (`purchase | generation | admin_grant | refund | welcome`), `ref`
  (testo libero: id generazione, nome pacchetto, nota admin), `created_at`.
- Il saldo NON si materializza: è la somma del ledger (stesso principio del
  consent ledger: il registro è la verità). Funzione SQL `spend_volt(user,
  amount, ref)` atomica (lock + verifica saldo + insert) per evitare race.

### Comportamento
- `/api/generate`: prima del motore, scala il costo totale in VOLT
  (valore categoria + supplemento compute ECHO). Saldo insufficiente:
  risposta gentile con saldo attuale e CTA "Ricarica i tuoi Volt".
  Vale per il flusso sincrono E per i job asincroni (enqueue solo a saldo ok,
  spesa al claim del job; se il job fallisce: storno `refund`).
- Saldo VOLT visibile nell'account (card dedicata, poi integrata nel
  ridisegno del Modulo 2).
- **Accredito manuale admin**: nel pannello admin, form "accredita N VOLT a
  utente" (reason `admin_grant`). Serve a vendere via bonifico PRIMA di
  Stripe: il loop dell'euro vero non aspetta le chiavi.
- Pacchetti definiti in `lib/volt.ts` (fonte unica, usata anche dalla futura
  pagina ricarica): 5 euro = 500; 10 = 1.000 + 50; 25 = 2.500 + 250;
  50 = 5.000 + 750; 100 = 10.000 + 2.000.
- PARCHEGGIATO (decisione Morelz): VOLT di benvenuto ai nuovi iscritti
  (eventualmente spendibili solo su tier Higgsfield, dove il compute non è
  costo vivo).

### Fasi successive (fuori da questo modulo)
- Fase B: Stripe Checkout sui pacchetti + webhook di accredito.
- Fase C: ricevute/IVA (commercialista), nota buono-chiuso (avvocato).

**Done quando:** un utente senza saldo viene bloccato con messaggio onesto;
l'admin gli accredita VOLT; la generazione va a buon fine scalando il costo
esatto; il ledger mostra i due movimenti; un job ECHO fallito storna.

## Modulo 2: ridisegno Account (buyer e creatore separati)

Stessa rotta `/account`, la pagina si biforca per ruolo. Il monolite
`app/account/page.tsx` si spezza in `components/account/*`.

### Account CREATORE (ha almeno un avatar) - due tab
**Tab "Il mio volto" (default):**
- Revenue-hero in cima sotto "Ciao": saldo maturato in grande, delta ultimi
  30 giorni vs 30 precedenti, utilizzi totali, bottone payout (soglia 50 euro
  come oggi).
- Due grafici in SVG fatto in casa (zero librerie nuove, sobri, coerenti col
  design hairline; abbellimento rimandato alla fase design come da metodo):
  andamento royalty ultimi 30 giorni (area per giorno) e ripartizione per
  categoria (barre orizzontali con conteggio e euro).
- Feed "utilizzi del tuo volto" con FILTRI: periodo (7/30/90/tutto),
  categoria, motore/tier. Ogni riga: Verifica + Condividi (cornice seller).
- Sotto, riordinate: consenso/kill switch, Soul, "il tuo volto è stato
  cercato", atto di proprietà/Phantom, saldo VOLT (dal Modulo 1).

**Tab "I miei contenuti":** griglia delle generazioni fatte da lui con FILTRI
(categoria, data, motore, avatar) e doppio pulsante Scarica (viola) +
Condividi (teal) già esistente.

### Account BUYER (nessun avatar)
Niente tab: "I miei contenuti" con filtri direttamente in cima, poi saldo
VOLT (in fase A la ricarica self-service non esiste: la card mostra i
pacchetti con "disponibile a breve" e un contatto; si attiva in fase B con
Stripe), KYC, e CTA "Metti il tuo volto nel registro" (l'account fa
reclutamento).

### Regola anti-limbo (vale per ogni lista/griglia)
Si mostrano ~6 elementi, sotto un bottone "Carica altri" che ne aggiunge 6.
Mai scroll infinito, mai pagina senza fondo.

### Fuori scope
Admin ed enterprise restano come sono. Nessuna migrazione: tutti i dati
esistono già (generations, avatars, payouts, volt_transactions).

**Done quando:** il creatore (test-card-e3) apre l'account e vede revenue
hero + grafici coi suoi numeri veri; filtra il feed per categoria e periodo;
la tab contenuti filtra e condivide; un buyer vede i suoi contenuti in cima
con "Carica altri" oltre i 6; niente euro nascosti in fondo alla pagina.

## Modulo 3: CTA "Genera con questo avatar" dal catalogo

Sul passport di ogni avatar attivo (non revocato), un pulsante GRANDE:
"Genera con questo avatar". Porta a `/match?avatar=<handle>`: MatchClient
legge il parametro e apre direttamente la vista concentrata su quel volto
(riusa la selezione avatar già costruita), saltando la ricerca. Il gate del
consenso resta identico: cambia solo la porta d'ingresso. Utente non loggato:
passa dal login e torna lì.

**Done quando:** dal catalogo si arriva alla generazione con l'avatar già
selezionato in due click; un avatar revocato NON mostra il pulsante; il
blocco categoria continua a funzionare identico.

## Vincoli trasversali
- Niente trattini lunghi nei testi destinati al pubblico (regola di Morelz
  in CLAUDE.md): virgole, due punti o parentesi.
- Regole d'oro V2 + EXPANSION_V3 invariate (gate consenso prima del motore,
  segreti server-side, mai importi in euro nelle cornici condivise).
- MAI mostrare al buyer la royalty della persona come "costo": la
  trasparenza dello split resta dov'è oggi (riepilogo post generazione).
