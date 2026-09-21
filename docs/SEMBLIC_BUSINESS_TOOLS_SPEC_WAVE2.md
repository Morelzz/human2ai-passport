# SEMBLIC FOR BUSINESS: Spec della seconda ondata (tool 11-20)

Dieci nuovi tool, di categorie diverse dai primi dieci (operations, HR, finanza agevolata, voce,
procurement, business intelligence). Obiettivo dichiarato: conquistare le PMI italiane rendendo
facile cio che oggi sembra difficile. Ogni tool deve essere potente ma semplice, snello, intuitivo.

Contesto: `docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md`. Formato come i tool A-J. Qui i tool sono lettera
K-T, con tra parentesi il numero della mappa. Indice completo dei 20: `docs/MASTER_BRIEF_SEMBLIC_FOR_BUSINESS.md`.
Data: 2026-06-18.

Principio di facilita (vale per tutti): setup guidato in pochi minuti, linguaggio umano, un'azione
principale per schermata, valori predefiniti sensati, e l'AI che fa il lavoro pesante al posto dell'utente.

---

# TOOL K: Bandi e incentivi (mappa #11)

## K.1 Cosa deve fare (in una frase)

Trovare bandi pubblici, incentivi e crediti d'imposta adatti all'azienda, verificare i requisiti e
aiutare a preparare la domanda.

## K.2 Il problema reale

I soldi pubblici (regionali, nazionali, europei) ci sono, ma sono nascosti in burocrazia illeggibile.
Le PMI non sanno che esistono o si arrendono davanti alla domanda.

## K.3 La differenza Semblic

Rende semplice una cosa percepita come impossibile: matching automatico sul profilo dell'azienda,
spiegazioni in italiano chiaro, nessuna promessa ma solo opportunita verificate da fonti ufficiali.

## K.4 Web o desktop

Web.

## K.5 Le pagine (MVP)

- `/business/incentivi`: cruscotto con i bandi adatti, scadenze e importi.
- `/business/incentivi/[id]`: dettaglio requisiti, check di idoneita, documenti necessari.
- `/business/incentivi/domanda`: assistente che prepara la bozza di domanda.

## K.6 Modello dati (Supabase / Postgres)

Tabella `biz_grants`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| title | text | |
| source | text | enum: eu \| stato \| regione \| camera |
| sectors | text[] | settori ammessi |
| company_size | text | micro, piccola, media |
| region | text | |
| amount_max_cents | int | |
| deadline | date | |
| requirements | jsonb | |
| url | text | fonte ufficiale |
| updated_at | timestamptz | |

Tabella `biz_grant_matches`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| grant_id | uuid (fk) | |
| score | int | quanto e adatto |
| eligible | bool | |
| missing | jsonb | cosa manca per essere idonei |
| status | text | enum: new \| applying \| submitted |

## K.7 Catena AI

Profila l'azienda (settore, dimensione, regione, obiettivi), confronta con i bandi, calcola idoneita
e cosa manca, genera una bozza di domanda. I dati dei bandi vengono da fonti ufficiali, sempre
aggiornate. Chiavi lato server.

## K.8 Sinergia col core

Bassa, ma valore percepito altissimo (porta soldi veri). Ottimo aggancio di ingresso.

## K.9 Criterio di "fatto" (MVP)

- [ ] Inserisco il profilo azienda e vedo i bandi adatti con importo e scadenza.
- [ ] Apro un bando e vedo requisiti e check di idoneita.
- [ ] Ottengo una bozza di domanda.

## K.10 Fuori scope (MVP)

- Invio diretto ai portali pubblici (fase 2).
- Consulenza umana (eventuale partnership con un commercialista).
- Qualsiasi garanzia di esito.

---

# TOOL L: Prenotazioni e appuntamenti (mappa #12)

## L.1 Cosa deve fare (in una frase)

Gestire agenda e prenotazioni online con promemoria automatici, riducendo i mancati arrivi.

## L.2 Il problema reale

Telefonate continue per prenotare, agende su carta, clienti che non si presentano. Vale per
ristoranti, parrucchieri, studi, officine.

## L.3 La differenza Semblic

Setup in cinque minuti, un link di prenotazione da mettere ovunque, promemoria automatici e una lista
d'attesa intelligente che riempie i buchi lasciati dalle cancellazioni.

## L.4 Web o desktop

Web, con una pagina pubblica di prenotazione e un widget.

## L.5 Le pagine (MVP)

- `/business/agenda`: calendario e slot.
- `/business/agenda/prenota`: pagina pubblica per il cliente.
- `/business/agenda/impostazioni`: orari, servizi, durate, promemoria.

## L.6 Modello dati (Supabase / Postgres)

Tabella `biz_services`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| duration_min | int | |
| price_cents | int | |
| capacity | int | posti per slot |

Tabella `biz_bookings`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| service_id | uuid (fk) | |
| customer_name | text | |
| customer_phone | text | |
| slot_start | timestamptz | |
| status | text | enum: confirmed \| cancelled \| no_show \| done |
| reminder_sent | bool | |
| source | text | |

## L.7 Catena AI

Suggerisce gli slot migliori, manda i promemoria, gestisce la lista d'attesa e riempie le
cancellazioni, prevede i mancati arrivi e propone un overbooking prudente.

## L.8 Sinergia col core

Bassa.

## L.9 Criterio di "fatto" (MVP)

- [ ] Creo un servizio con durata e prezzo.
- [ ] Un cliente prenota dalla pagina pubblica.
- [ ] Parte un promemoria automatico.
- [ ] Segno un mancato arrivo e il sistema ne tiene conto.

## L.10 Fuori scope (MVP)

- Pagamenti anticipati (fase 2).
- Sincronizzazione completa con i calendari esterni (fase 2).

---

# TOOL M: Centralino AI, receptionist telefonico (mappa #13)

## M.1 Cosa deve fare (in una frase)

Rispondere alle telefonate dell'azienda con una voce AI, dare informazioni, prendere prenotazioni e
messaggi, e passare all'umano quando serve.

## M.2 Il problema reale

Le PMI perdono chiamate (linea occupata, fuori orario) e quindi clienti, ma non possono permettersi
un centralinista.

## M.3 La differenza Semblic

Voce naturale italiana, conosce l'azienda (le stesse fonti dell'assistente clienti), e trasparente
(dichiara di essere un assistente), passa la chiamata o prende un messaggio. Registrazioni protette.

## M.4 Web o desktop

Web per la configurazione, il servizio gira in cloud (numero dedicato o inoltro di chiamata).

## M.5 Le pagine (MVP)

- `/business/centralino`: numero, orari, flusso di risposta.
- `/business/centralino/chiamate`: registro chiamate, trascrizioni, messaggi.
- `/business/centralino/voce`: scelta della voce e dei messaggi.

## M.6 Modello dati (Supabase / Postgres)

Tabella `biz_phone_lines`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| number | text | |
| hours | jsonb | orari |
| greeting | text | messaggio di benvenuto |
| fallback_to | text | numero o email per l'inoltro |

Tabella `biz_calls`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| line_id | uuid (fk) | |
| caller | text | |
| transcript | text | |
| intent | text | es. info, prenotazione, messaggio |
| outcome | text | enum: info \| booking \| message \| handoff |
| recording_url | text \| null | |
| created_at | timestamptz | default now() |

## M.7 Catena AI

Speech to text, comprensione dell'intento, risposta vocale (text to speech), azioni (prenota, prendi
messaggio, inoltra). Riusa il knowledge base del Tool F. Chiavi lato server.

## M.8 Sinergia col core

Media. In futuro la voce (e un volto per i video) potrebbe venire da un avatar consenziente del
registro, ponte col core.

## M.9 Criterio di "fatto" (MVP)

- [ ] Configuro orari e messaggio di benvenuto.
- [ ] Una chiamata demo riceve risposta e lascia un messaggio.
- [ ] Vedo trascrizione e intento della chiamata.
- [ ] Fuori orario il sistema prende il messaggio.

## M.10 Fuori scope (MVP)

- Integrazione con tutti gli operatori telefonici (dipende dal provider, fase 2).
- Chiamate in uscita massive.

---

# TOOL N: Magazzino e previsione domanda (mappa #14)

## N.1 Cosa deve fare (in una frase)

Tenere il magazzino aggiornato, avvisare quando riordinare e prevedere la domanda, per non restare
senza scorte ne con troppo invenduto.

## N.2 Il problema reale

Magazzino gestito a occhio o su Excel: rotture di stock, capitale fermo in invenduto, sprechi
(soprattutto nel food).

## N.3 La differenza Semblic

Previsione semplice e spiegata, soglie di riordino automatiche, avvisi nell'app. Pensata per chi non
ha mai usato un gestionale.

## N.4 Web o desktop

Ibrido. Web, con agente desktop per importare da file o dalla cassa.

## N.5 Le pagine (MVP)

- `/business/magazzino`: giacenze, sotto-scorta, valore.
- `/business/magazzino/previsioni`: domanda prevista per prodotto.
- `/business/magazzino/riordini`: proposte di riordino.

## N.6 Modello dati (Supabase / Postgres)

Tabella `biz_products`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| sku | text | |
| stock | int | giacenza |
| reorder_point | int | soglia di riordino |
| cost_cents | int | |
| price_cents | int | |

Tabella `biz_stock_moves`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| product_id | uuid (fk) | |
| qty | int | |
| type | text | enum: in \| out \| waste |
| occurred_at | timestamptz | |

Tabella `biz_forecasts`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| product_id | uuid (fk) | |
| period | text | es. settimana prossima |
| predicted_qty | int | |
| confidence | numeric | |

## N.7 Catena AI

Prevede la domanda da storico e stagionalita, calcola punto di riordino e quantita ottimale, segnala
i prodotti a rischio di rottura o di invenduto.

## N.8 Sinergia col core

Bassa.

## N.9 Criterio di "fatto" (MVP)

- [ ] Carico prodotti e giacenze.
- [ ] Vedo i prodotti sotto-scorta.
- [ ] Ottengo una previsione e una proposta di riordino.
- [ ] Registro uno scarico di magazzino.

## N.10 Fuori scope (MVP)

- Integrazione con tutti i POS e gestionali (fase 2).
- Gestione avanzata di lotti e scadenze (fase 2).

---

# TOOL O: Turni e personale (mappa #15)

## O.1 Cosa deve fare (in una frase)

Creare i turni del personale in automatico tenendo conto di disponibilita, costi e regole, e
condividerli con il team.

## O.2 Il problema reale

Fare i turni a mano e un incubo (disponibilita, ferie, picchi), con errori e malumori, e il costo del
lavoro che sfugge di mano.

## O.3 La differenza Semblic

Turni generati con un clic e ottimizzati su costo e copertura. I dipendenti vedono i turni e chiedono
i cambi dall'app. Semplice.

## O.4 Web o desktop

Web.

## O.5 Le pagine (MVP)

- `/business/turni`: calendario settimanale.
- `/business/turni/team`: dipendenti, ruoli, disponibilita.
- `/business/turni/costi`: ore e costo previsto.

## O.6 Modello dati (Supabase / Postgres)

Tabella `biz_staff`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| role | text | |
| hourly_cost_cents | int | |
| max_hours_week | int | |

Tabella `biz_shifts`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| staff_id | uuid (fk) | |
| start | timestamptz | |
| end | timestamptz | |
| role | text | |
| status | text | enum: planned \| published \| swapped |

## O.7 Catena AI

Genera i turni ottimizzando copertura e costo, rispetta disponibilita e tetti di ore, propone
soluzioni ai buchi e gestisce le richieste di cambio.

## O.8 Sinergia col core

Bassa.

## O.9 Criterio di "fatto" (MVP)

- [ ] Aggiungo dipendenti e disponibilita.
- [ ] Genero i turni della settimana.
- [ ] Vedo il costo previsto.
- [ ] Pubblico i turni e un dipendente chiede un cambio.

## O.10 Fuori scope (MVP)

- Timbrature e presenze (fase 2).
- Buste paga (restano al consulente del lavoro).
- Conformita completa al CCNL (supporto, non sostitutivo).

---

# TOOL P: Pricing e margini (mappa #16)

## P.1 Cosa deve fare (in una frase)

Analizzare costi e margini e suggerire i prezzi giusti, con simulazioni e attenzione alla concorrenza.

## P.2 Il problema reale

Molte PMI fanno i prezzi a sensazione, lasciando margine sul tavolo o vendendo in perdita senza saperlo.

## P.3 La differenza Semblic

Calcola il margine reale (anche i costi che si dimenticano), suggerisce i prezzi e li spiega, simula
gli scenari. Niente fogli di calcolo complicati.

## P.4 Web o desktop

Web.

## P.5 Le pagine (MVP)

- `/business/prezzi`: listino con margine per prodotto.
- `/business/prezzi/simula`: scenari di prezzo e volume.
- `/business/prezzi/consigli`: suggerimenti dell'AI.

## P.6 Modello dati (Supabase / Postgres)

Tabella `biz_pricing_items`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| cost_cents | int | |
| price_cents | int | |
| margin_pct | numeric | calcolato |
| volume_month | int | |
| suggested_price_cents | int \| null | |

## P.7 Catena AI

Calcola i margini, individua i prodotti sottoprezzo o in perdita, propone prezzi e simula l'effetto su
ricavi e margine, tenendo conto di una elasticita stimata. Chiavi lato server.

## P.8 Sinergia col core

Bassa.

## P.9 Criterio di "fatto" (MVP)

- [ ] Inserisco costi e prezzi e vedo il margine reale.
- [ ] Ricevo un suggerimento di prezzo spiegato.
- [ ] Simulo uno scenario e vedo l'effetto su ricavi e margine.

## P.10 Fuori scope (MVP)

- Raccolta automatica dei prezzi dei concorrenti (fase 2, valutare fonti e legalita).
- Pricing dinamico in tempo reale (fase 3).

---

# TOOL Q: Pubblicita e campagne (mappa #17)

## Q.1 Cosa deve fare (in una frase)

Creare e gestire campagne pubblicitarie su Meta e Google con il budget sotto controllo, e ottimizzare
i risultati.

## Q.2 Il problema reale

La pubblicita online funziona ma e complessa e rischiosa: le PMI bruciano budget o rinunciano del tutto.

## Q.3 La differenza Semblic

Campagne guidate (obiettivo, budget, pubblico), creativita presa dallo Studio Contenuti, guardrail sul
budget, report in italiano semplice. Rende facile una cosa temuta.

## Q.4 Web o desktop

Web.

## Q.5 Le pagine (MVP)

- `/business/ads`: campagne attive, spesa, risultati.
- `/business/ads/nuova`: obiettivo, budget, pubblico, creativita.
- `/business/ads/report`: andamento e spiegazione.

## Q.6 Modello dati (Supabase / Postgres)

Tabella `biz_ad_campaigns`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| platform | text | enum: meta \| google |
| objective | text | |
| budget_cents | int | tetto di spesa |
| audience | jsonb | |
| status | text | enum: draft \| active \| paused |
| results | jsonb | |
| created_at | timestamptz | default now() |

## Q.7 Catena AI

Propone obiettivo e pubblico, genera la creativita (riusa il Tool A e i volti consenzienti del core),
suggerisce il budget, ottimizza e spiega i risultati. Guardrail: mai spesa oltre il tetto, conferma
umana prima di pubblicare.

## Q.8 Sinergia col core

Alta. Creativita dal Tool A, volti dal registro.

## Q.9 Criterio di "fatto" (MVP)

- [ ] Creo una campagna con obiettivo e budget.
- [ ] Genero la creativita.
- [ ] Vedo una stima dei risultati.
- [ ] Il sistema non supera mai il budget impostato.

## Q.10 Fuori scope (MVP)

- Pubblicazione reale senza account collegati (serve OAuth Meta e Google, fase 2).
- Gestione di budget molto grandi.

---

# TOOL R: Fidelizzazione e email marketing (mappa #18)

## R.1 Cosa deve fare (in una frase)

Trasformare i clienti in clienti che tornano, con newsletter, promozioni mirate e una raccolta punti
semplice.

## R.2 Il problema reale

Le PMI inseguono il cliente nuovo e dimenticano chi ha gia comprato, che e il piu redditizio.

## R.3 La differenza Semblic

Segmenti automatici (clienti persi, affezionati), email scritte nel tono del brand, raccolta punti
senza tessere. Semplice.

## R.4 Web o desktop

Web.

## R.5 Le pagine (MVP)

- `/business/fidelizza`: segmenti e campagne.
- `/business/fidelizza/campagna`: crea email o promozione.
- `/business/fidelizza/punti`: programma fedelta.

## R.6 Modello dati (Supabase / Postgres)

Tabella `biz_customers`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| email | text | |
| last_purchase | date \| null | |
| total_spent_cents | int | |
| segment | text | es. affezionato, a rischio, perso |
| points | int | |

Tabella `biz_campaigns_mk`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| segment | text | destinatari |
| content | text | |
| sent_at | timestamptz \| null | |
| results | jsonb | |

## R.7 Catena AI

Segmenta i clienti, individua chi sta per perdersi, scrive email mirate nel tono del brand, suggerisce
promozioni e il momento giusto per inviarle. Chiavi lato server.

## R.8 Sinergia col core

Media. Riusa il brand voice, e puo usare volti consenzienti nelle email.

## R.9 Criterio di "fatto" (MVP)

- [ ] Importo i clienti e vedo i segmenti.
- [ ] Creo una campagna per i clienti persi.
- [ ] Il testo e nel tono del brand.
- [ ] Vedo i punti di un cliente.

## R.10 Fuori scope (MVP)

- Invio massivo via SMS (fase 2).
- Integrazione completa con l'e-commerce (fase 2).

---

# TOOL S: Acquisti e fornitori (mappa #19)

## S.1 Cosa deve fare (in una frase)

Tenere sotto controllo ordini e fornitori, confrontare le offerte e segnalare dove si puo risparmiare.

## S.2 Il problema reale

Gli acquisti sono frammentati, i prezzi dei fornitori cambiano, e si paga piu del dovuto senza
accorgersene.

## S.3 La differenza Semblic

Confronto chiaro tra fornitori, promemoria di riordino, avvisi sui rincari, bozze di richiesta offerta.
Semplice.

## S.4 Web o desktop

Web.

## S.5 Le pagine (MVP)

- `/business/acquisti`: ordini e spesa per fornitore.
- `/business/acquisti/fornitori`: anagrafica e confronto.
- `/business/acquisti/risparmi`: suggerimenti.

## S.6 Modello dati (Supabase / Postgres)

Tabella `biz_suppliers`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| category | text | |
| rating | numeric | |
| terms | text | condizioni |

Tabella `biz_purchase_orders`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| supplier_id | uuid (fk) | |
| items | jsonb | |
| total_cents | int | |
| status | text | enum: draft \| ordered \| received |
| ordered_at | timestamptz \| null | |

## S.7 Catena AI

Confronta offerte e condizioni, segnala rincari e alternative, prevede i riordini, genera bozze di
richiesta offerta e di ordine. Chiavi lato server.

## S.8 Sinergia col core

Bassa.

## S.9 Criterio di "fatto" (MVP)

- [ ] Aggiungo fornitori e ordini.
- [ ] Confronto due fornitori sullo stesso articolo.
- [ ] Ricevo un avviso di rincaro.
- [ ] Genero una richiesta di offerta.

## S.10 Fuori scope (MVP)

- Integrazione EDI con i fornitori (fase 2).
- Pagamenti.

---

# TOOL T: Cruscotto direzionale AI (mappa #20)

## T.1 Cosa deve fare (in una frase)

Riunire i dati dei vari tool in un'unica vista e dare ogni settimana un "direttore operativo AI" che
dice come va l'azienda e cosa fare.

## T.2 Il problema reale

L'imprenditore non ha tempo di guardare dieci strumenti. Vuole sapere in trenta secondi come va e dove
intervenire.

## T.3 La differenza Semblic

Un solo cruscotto, linguaggio umano, avvisi proattivi e un briefing settimanale. Trasforma i dati in
decisioni. E il collante di tutti i venti tool.

## T.4 Web o desktop

Web, con briefing via email o notifica.

## T.5 Le pagine (MVP)

- `/business/cruscotto`: KPI chiave e andamento.
- `/business/cruscotto/avvisi`: alert e anomalie.
- `/business/cruscotto/briefing`: report settimanale dell'AI.

## T.6 Modello dati (Supabase / Postgres)

Tabella `biz_metrics`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| source_tool | text | da quale tool arriva |
| metric | text | |
| value | numeric | |
| period | text | |

Tabella `biz_insights`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| kind | text | enum: alert \| win \| risk |
| text | text | |
| severity | text | alta, media, bassa |
| created_at | timestamptz | default now() |

Tabella `biz_briefings`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| week | text | |
| summary | text | |
| actions | jsonb | 3 azioni prioritarie |

## T.7 Catena AI

Aggrega le metriche dagli altri tool, individua trend e anomalie, scrive un briefing settimanale con
tre azioni prioritarie in linguaggio semplice. Chiavi lato server.

## T.8 Sinergia col core

Alta. Lega tutti i tool e da visibilita anche al core (utilizzi degli avatar, royalty maturate).

## T.9 Criterio di "fatto" (MVP)

- [ ] Vedo i KPI principali in un colpo d'occhio.
- [ ] Ricevo un avviso su un'anomalia.
- [ ] Leggo un briefing settimanale con tre azioni.
- [ ] I dati arrivano dagli altri tool.

## T.10 Fuori scope (MVP)

- Connettori a strumenti esterni non Semblic (fase 2).
- Previsioni finanziarie complesse (fase 3).

---

## Nota trasversale (tool 11-20)

Stessi guardrail delle altre spec: web-first, chiavi AI solo lato server, dati sensibili mai nel
client, un solo account e wallet Semblic, human in the loop dove si pubblica, si invia o si spende
(ads), disclaimer di "supporto non sostitutivo" dove servono competenze professionali (bandi,
pricing, lavoro), e mai trattini lunghi nei testi pubblici.

