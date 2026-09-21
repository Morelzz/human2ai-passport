# SEMBLIC FOR BUSINESS: Spec dei 3 tool P2

Specifica operativa della seconda fascia di tool (priorita P2), da costruire dopo i 3 P1.
Contesto e strategia: vedi `docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md`.
Stile e convenzioni come `docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md` (che copre i tool A, B, C).
Qui i tool sono lettera D, E, F, con tra parentesi il numero della mappa dei 10. Data: 2026-06-18.

Infrastruttura condivisa: i tool E e F usano lo stesso motore di ricerca su documenti
(embedding con pgvector su Supabase, RAG con citazione della fonte). Si costruisce una volta.

---

# TOOL D: Amministrazione e fatture (mappa #1)

## D.1 Cosa deve fare (in una frase)

Leggere fatture e ricevute, organizzarle in automatico, ricordare le scadenze fiscali, segnalare
anomalie e preparare tutto per il commercialista.

## D.2 Il problema reale

Le PMI italiane perdono ore tra fatturazione elettronica, ricevute cartacee e scadenze IVA o F24.
Gli errori (doppioni, IVA sbagliata, scadenze perse) costano in sanzioni e stress.

## D.3 La differenza Semblic

- Privacy by default: i dati contabili sono sensibili, restano lato server, o solo in locale con
  l'agente desktop per chi non vuole caricarli da nessuna parte.
- Italiano-first: pensato sulle scadenze e sui documenti italiani.
- Onesta: e uno strumento di supporto, non sostituisce il commercialista.

## D.4 Web o desktop

Ibrido. Un agente desktop sottile monitora una cartella locale (es. dove scarichi le fatture XML o i
PDF) e le pre-elabora, mentre la dashboard resta web. Chi non vuole l'agente carica i file dal web.

## D.5 Le pagine (MVP)

- `/business/conti`: cruscotto con scadenze in arrivo, anomalie da controllare, totali del periodo.
- `/business/conti/documenti`: elenco di fatture e ricevute con stato e filtri.
- `/business/conti/documenti/[id]`: dettaglio con i campi estratti, la categoria, eventuale anomalia.
- `/business/conti/esporta`: riepilogo CSV o pacchetto da mandare al commercialista.

## D.6 Modello dati (Supabase / Postgres)

Tabella `biz_fin_documents`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| direction | text | enum: in \| out (acquisto o vendita) |
| doc_type | text | enum: invoice \| receipt \| expense |
| counterpart | text | fornitore o cliente |
| amount_cents | int | totale in centesimi |
| vat_cents | int | IVA in centesimi |
| doc_date | date | |
| due_date | date \| null | scadenza pagamento |
| category | text | categoria contabile |
| status | text | enum: to_review \| categorized \| sent_to_accountant |
| source | text | enum: upload \| desktop_agent |
| anomaly | jsonb \| null | es. {tipo, spiegazione} |
| created_at | timestamptz | default now() |

Tabella `biz_fin_deadlines`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| kind | text | es. IVA, F24, altro |
| due_date | date | |
| amount_cents | int \| null | |
| status | text | enum: upcoming \| done |
| notified_at | timestamptz \| null | |

## D.7 Catena AI

1. OCR ed estrazione campi (numero, data, imponibile, IVA, totale) da PDF o XML.
2. Categorizzazione automatica del documento.
3. Rilevamento anomalie: doppioni, importi fuori scala, IVA incoerente.
4. Spiegazioni in linguaggio semplice. Chiavi lato server.

## D.8 Sinergia col core

Bassa. Stesso account e stesso wallet Semblic. Valore soprattutto di utilita e retention.

## D.9 Criterio di "fatto" (MVP)

- [ ] Carico una fattura PDF e ottengo i campi estratti e la categoria.
- [ ] Vedo le scadenze IVA e F24 con un promemoria.
- [ ] Il sistema segnala un doppione o una IVA incoerente.
- [ ] Esporto un riepilogo CSV per il commercialista.
- [ ] Dati sensibili lato server, o solo in locale con l'agente desktop.

## D.10 Fuori scope (MVP)

- Invio diretto allo SdI e fatturazione elettronica attiva (serve intermediario accreditato, fase 2).
- Integrazione con gestionali esterni (fase 3).
- Pagamenti veri.

---

# TOOL E: Assistente clienti integrabile (mappa #3)

## E.1 Cosa deve fare (in una frase)

Dare alla PMI un assistente, addestrato sui propri contenuti, che risponde ai clienti su sito,
WhatsApp ed email, in piu lingue, e passa la palla a un umano quando serve.

## E.2 Il problema reale

Le piccole imprese non riescono a rispondere a tutte le richieste (orari, prezzi, disponibilita) e
perdono clienti, soprattutto fuori orario. Un assistente generico inventa risposte e fa danni.

## E.3 La differenza Semblic

- Addestrato solo sui dati dell'azienda: se non sa, non inventa, passa all'umano.
- Trasparenza: dichiara di essere un assistente AI.
- Privacy: le fonti restano lato server, niente addestramento di modelli terzi.

## E.4 Web o desktop

Web. Widget integrabile nel sito con uno snippet, piu i canali WhatsApp ed email.

## E.5 Le pagine (MVP)

- `/business/assistente/setup`: carica le fonti (sito, FAQ, documenti).
- `/business/assistente/canali`: widget sito (snippet di embed), WhatsApp, email.
- `/business/assistente/conversazioni`: storico, con evidenza di quelle passate all'umano.
- `/business/assistente/stile`: tono preso dal profilo brand voice, colori del widget.

## E.6 Modello dati (Supabase / Postgres, con pgvector)

Tabella `biz_assistants`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| brand_id | uuid \| null | profilo voce (vedi Tool A) |
| channels | jsonb | es. {site:true, whatsapp:false} |
| fallback_email | text | dove inoltrare se non sa rispondere |
| created_at | timestamptz | default now() |

Tabella `biz_kb_chunks` (condivisa col Tool F):

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| source_ref | text | da quale fonte arriva |
| content | text | pezzo di testo |
| embedding | vector | per la ricerca semantica |

Tabella `biz_conversations`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| assistant_id | uuid (fk) | |
| channel | text | enum: site \| whatsapp \| email |
| messages | jsonb | scambio domanda e risposta |
| handed_off | bool | passata a un umano |
| created_at | timestamptz | default now() |

## E.7 Catena AI (RAG)

1. Si ingeriscono le fonti, si dividono in pezzi e si calcolano gli embedding (pgvector).
2. A ogni domanda si recuperano i pezzi piu pertinenti.
3. Si risponde col tono del brand, citando la fonte.
4. Regola d'oro: se la risposta non e nelle fonti, passa all'umano (email di fallback).
5. Chiavi lato server.

## E.8 Sinergia col core

Media. Stesso account. In futuro l'assistente potrebbe rispondere con un volto o un video di un
avatar consenziente del registro (ponte col core), in una fase successiva.

## E.9 Criterio di "fatto" (MVP)

- [ ] Carico il sito e l'assistente risponde su orari e prezzi citando la fonte.
- [ ] Incollo lo snippet e il widget appare su una pagina di prova.
- [ ] Una domanda fuori ambito viene inoltrata via email, senza inventare.
- [ ] Il tono e coerente col profilo brand voice.

## E.10 Fuori scope (MVP)

- Voce e telefonia.
- Integrazioni CRM complesse.
- Pagamenti dentro la chat.

---

# TOOL F: Cervello aziendale, knowledge base interna (mappa #7)

## F.1 Cosa deve fare (in una frase)

Far caricare i documenti interni (procedure, listini, contratti, manuali) e permettere di fare
domande in linguaggio naturale, con risposte che citano la fonte. Ottimo per l'onboarding.

## F.2 Il problema reale

La conoscenza e sparsa tra email, PDF e teste delle persone. I nuovi dipendenti perdono settimane e
le stesse domande tornano all'infinito.

## F.3 La differenza Semblic

- Privacy: documenti sensibili lato server, o solo in locale con l'agente desktop.
- Risposte con citazione della fonte interna, niente invenzioni.
- Controllo accessi: chi vede cosa.

## F.4 Web o desktop

Ibrido. Web per la maggior parte, desktop per chi vuole tenere i documenti solo sul proprio computer.

## F.5 Le pagine (MVP)

- `/business/sapere`: libreria documenti, organizzati per area.
- `/business/sapere/chiedi`: chat con risposte e citazioni.
- `/business/sapere/spazi`: spazi e permessi (chi accede a cosa).
- `/business/sapere/onboarding`: percorsi per ruolo (es. "nuovo cameriere").

## F.6 Modello dati (Supabase / Postgres, con pgvector)

Tabella `biz_kb_spaces`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| name | text | |
| access | jsonb | regole di accesso |
| created_at | timestamptz | default now() |

Tabella `biz_kb_documents`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| space_id | uuid (fk) | |
| title | text | |
| source | text | enum: upload \| desktop_agent |
| content | text | testo del documento |
| created_at | timestamptz | default now() |

Gli embedding usano la stessa tabella `biz_kb_chunks` del Tool E (motore condiviso).

Tabella `biz_kb_queries`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| space_id | uuid (fk) | |
| question | text | |
| answer | text | |
| sources | jsonb | fonti citate |
| created_at | timestamptz | default now() |

## F.7 Catena AI (RAG)

1. Ingest dei documenti, divisione in pezzi, embedding (pgvector).
2. Recupero dei pezzi pertinenti rispettando i permessi dello spazio.
3. Risposta con citazione della fonte.
4. Nessun addestramento sui dati del cliente. Chiavi lato server.

## F.8 Sinergia col core

Media. Stesso account, e condivide il motore RAG col Tool E (una sola base tecnica per due prodotti).

## F.9 Criterio di "fatto" (MVP)

- [ ] Carico cinque documenti e ottengo risposte corrette con citazione.
- [ ] Un utente senza permesso non vede uno spazio riservato.
- [ ] Creo un percorso di onboarding per un ruolo.
- [ ] Dati lato server, o solo in locale con l'agente desktop.

## F.10 Fuori scope (MVP)

- Connettori automatici a Google Drive o SharePoint (fase 2).
- Ricerca dentro le email.
- Multi-tenant avanzato.

---

## Nota trasversale

Stessi guardrail dei tool A, B, C: chiavi AI solo lato server, dati sensibili mai nel client, un solo
account e wallet Semblic, disclaimer di "supporto non sostitutivo" dove servono competenze
professionali (commercialista per il Tool D), e mai trattini lunghi nei testi pubblici.
