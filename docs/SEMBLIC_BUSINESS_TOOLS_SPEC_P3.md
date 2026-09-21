# SEMBLIC FOR BUSINESS: Spec dei 4 tool P3

Specifica operativa della terza fascia di tool (priorita P3), gli ultimi della mappa dei 10.
Contesto: vedi `docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md`. Formato come i tool A-F nelle altre due spec.
Qui i tool sono lettera G, H, I, J, con tra parentesi il numero della mappa. Data: 2026-06-18.

Diversi tool riusano il profilo brand voice del Tool A (per scrivere nel tono dell'azienda).

---

# TOOL G: Radar recensioni e reputazione (mappa #4)

## G.1 Cosa deve fare (in una frase)

Raccogliere le recensioni da piu fonti, analizzare il sentiment, suggerire le risposte e segnalare
trend e clienti a rischio.

## G.2 Il problema reale

Le PMI non monitorano le recensioni, rispondono tardi o male, e la reputazione online ne risente.

## G.3 La differenza Semblic

Risposte nel tono del brand (riusa il profilo del Tool A), nessuna risposta pubblicata in automatico
senza l'ok dell'utente (human in the loop), trasparenza.

## G.4 Web o desktop

Web.

## G.5 Le pagine (MVP)

- `/business/reputazione`: dashboard con media voti, ripartizione sentiment, trend nel tempo.
- `/business/reputazione/recensioni`: elenco con filtro per fonte e sentiment, bozza di risposta.
- `/business/reputazione/fonti`: collega le fonti (Google, TripAdvisor, social).

## G.6 Modello dati (Supabase / Postgres)

Tabella `biz_reviews`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| source | text | enum: google \| tripadvisor \| facebook \| other |
| author | text | |
| rating | int | 1-5 |
| text | text | |
| sentiment | text | enum: pos \| neu \| neg |
| topics | text[] | temi estratti (es. servizio, prezzo) |
| replied | bool | |
| created_at | timestamptz | default now() |

Tabella `biz_review_sources`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| source | text | |
| ref | text | id pagina o luogo |
| connected_at | timestamptz | |

## G.7 Catena AI

Classifica sentiment e temi, raggruppa per argomento, genera una bozza di risposta nel tono del
brand, segnala picchi negativi e temi ricorrenti. Chiavi lato server.

## G.8 Sinergia col core

Bassa, ma riusa il brand voice del Tool A.

## G.9 Criterio di "fatto" (MVP)

- [ ] Vedo media voti e ripartizione del sentiment.
- [ ] Filtro le recensioni per fonte e per sentiment.
- [ ] Ottengo una bozza di risposta on-brand.
- [ ] Il sistema segnala un calo o un tema negativo ricorrente.

## G.10 Fuori scope (MVP)

- Pubblicazione automatica delle risposte (serve API e permessi per fonte, fase 2).
- Analisi dei competitor.

---

# TOOL H: CRM leggero con AI (mappa #6)

## H.1 Cosa deve fare (in una frase)

Gestire contatti e pipeline di vendita con lead scoring AI, suggerimenti di follow-up, bozze email e
riassunto della pipeline.

## H.2 Il problema reale

Molte PMI gestiscono i clienti su Excel o WhatsApp, perdono i follow-up e quindi le opportunita.

## H.3 La differenza Semblic

Leggero (non un CRM enterprise), bozze nel tono del brand, privacy dei contatti.

## H.4 Web o desktop

Web.

## H.5 Le pagine (MVP)

- `/business/crm`: pipeline a colonne (Nuovo, Contattato, Proposta, Chiuso).
- `/business/crm/contatto/[id]`: scheda con storico, lead score, prossima azione.
- `/business/crm/azioni`: i follow-up suggeriti del giorno.

## H.6 Modello dati (Supabase / Postgres)

Tabella `biz_contacts`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| email | text | |
| phone | text | |
| company | text | |
| stage | text | enum: new \| contacted \| proposal \| won \| lost |
| value_cents | int | valore stimato |
| lead_score | int | 0-100, calcolato dall'AI |
| next_action | text | prossima azione suggerita |
| next_action_at | date \| null | |
| created_at | timestamptz | default now() |

Tabella `biz_activities`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| contact_id | uuid (fk) | |
| type | text | enum: call \| email \| note \| meeting |
| detail | text | |
| occurred_at | timestamptz | |

## H.7 Catena AI

Calcola il lead score da segnali (interazioni, valore, tempi), suggerisce la prossima azione, genera
bozze di email di follow-up nel tono del brand, riassume la pipeline. Chiavi lato server.

## H.8 Sinergia col core

Bassa.

## H.9 Criterio di "fatto" (MVP)

- [ ] Vedo la pipeline a colonne e sposto un contatto da una fase all'altra.
- [ ] Un contatto ha un lead score e una prossima azione suggerita.
- [ ] Genero una bozza di email di follow-up on-brand.
- [ ] Vedo un riepilogo della pipeline.

## H.10 Fuori scope (MVP)

- Automazioni complesse.
- Integrazione email bidirezionale completa (fase 2).
- Preventivi e contratti (e il Tool B).

---

# TOOL I: Assistente email e riunioni (mappa #8)

## I.1 Cosa deve fare (in una frase)

Preparare bozze di risposta alle email, riassumere i thread, trascrivere le riunioni ed estrarne le
azioni.

## I.2 Il problema reale

Troppe email e troppe riunioni, poco tempo. Le decisioni e le azioni si perdono.

## I.3 La differenza Semblic

Bozze nel tono del brand, privacy (audio e testi sensibili lato server, o in locale con l'agente
desktop), human in the loop (l'utente approva prima di inviare).

## I.4 Web o desktop

Ibrido. Web per la maggior parte, desktop utile per l'audio locale delle riunioni.

## I.5 Le pagine (MVP)

- `/business/posta`: un thread con riassunto e bozza di risposta suggerita.
- `/business/riunioni`: elenco delle riunioni.
- `/business/riunioni/[id]`: trascrizione, riassunto, elenco azioni con assegnatario e scadenza.

## I.6 Modello dati (Supabase / Postgres)

Tabella `biz_email_threads`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| subject | text | |
| summary | text | riassunto AI |
| draft_reply | text | bozza suggerita |
| created_at | timestamptz | default now() |

Tabella `biz_meetings`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| title | text | |
| transcript | text | |
| summary | text | |
| actions | jsonb | es. [{text, owner, due}] |
| source | text | enum: upload \| desktop_agent |
| created_at | timestamptz | default now() |

## I.7 Catena AI

Riassunto del thread, bozza di risposta nel tono del brand, trascrizione audio (speech to text) ed
estrazione delle azioni con assegnatario e scadenza. Chiavi lato server.

## I.8 Sinergia col core

Bassa.

## I.9 Criterio di "fatto" (MVP)

- [ ] Apro un thread e ottengo riassunto e bozza di risposta.
- [ ] Carico (o registro con l'agente) una riunione e ottengo trascrizione, riassunto e azioni.
- [ ] Le azioni hanno assegnatario e scadenza.

## I.10 Fuori scope (MVP)

- Invio automatico delle email (resta human in the loop).
- Lettura diretta della casella email (connettore in fase 2, in MVP si incolla o si inoltra il thread).
- Integrazione completa col calendario (fase 2).

---

# TOOL J: Sito e landing con SEO locale (mappa #9)

## J.1 Cosa deve fare (in una frase)

Da una descrizione, generare un sito o una landing page con testi ottimizzati e SEO per le ricerche
locali.

## J.2 Il problema reale

Molte PMI non hanno un sito decente, o ne hanno uno vecchio. La SEO locale resta un mistero.

## J.3 La differenza Semblic

Design on-brand (puo usare i colori del cliente), testi nel tono del brand, e possibilita di inserire
nelle immagini un volto Semblic consenziente (ponte col core).

## J.4 Web o desktop

Web.

## J.5 Le pagine (MVP)

- `/business/sito`: descrivi l'attivita e genera.
- `/business/sito/editor`: anteprima a blocchi modificabili (hero, servizi, contatti).
- `/business/sito/seo`: titolo, meta, parole chiave locali, punteggio.

## J.6 Modello dati (Supabase / Postgres)

Tabella `biz_sites`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| business_name | text | |
| description | text | brief dell'attivita |
| blocks | jsonb | sezioni del sito |
| theme | jsonb | colori e font |
| seo | jsonb | es. {title, meta, keywords[]} |
| status | text | enum: draft \| published |
| created_at | timestamptz | default now() |

## J.7 Catena AI

Genera struttura e testi dei blocchi, propone parole chiave locali (es. "idraulico a Bologna"),
calcola un punteggio SEO con suggerimenti pratici. Chiavi lato server.

## J.8 Sinergia col core

Media. Le immagini possono usare volti consenzienti del registro (ponte col core).

## J.9 Criterio di "fatto" (MVP)

- [ ] Da una descrizione ottengo una landing con hero, servizi e contatti.
- [ ] Modifico un blocco di testo.
- [ ] Vedo titolo, meta e parole chiave locali con un punteggio.
- [ ] Esporto o pubblico una bozza.

## J.10 Fuori scope (MVP)

- E-commerce.
- Dominio e hosting gestiti (fase 2).
- Siti multi-pagina complessi.

---

## Nota trasversale

Stessi guardrail delle altre spec: chiavi AI solo lato server, dati sensibili mai nel client, un solo
account e wallet Semblic, human in the loop dove si pubblica o si invia, e mai trattini lunghi nei
testi pubblici.

Con questo file i 10 tool della mappa sono tutti specificati: A-C (P1), D-F (P2), G-J (P3).
