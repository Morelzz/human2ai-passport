# SEMBLIC FOR BUSINESS: Spec dei primi 3 tool

Specifica operativa dei tre tool a priorita P1, i piu vicini al DNA di Semblic.
Contesto e strategia: vedi `docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md`.
Stile e convenzioni: come `docs/AVATAR_PASSPORT_SPEC.md`. Dati DEMO finche non si decide.
Data: 2026-06-18.

Ordine di costruzione: prima il **Tool A (flagship)**, poi B e C.

---

# TOOL A (FLAGSHIP): Studio Contenuti

> Nota sul nome: il core ha gia `/studio` (lo studio avatar). Per evitare confusione, questo tool
> vive su `/business/contenuti` e nei testi pubblici si chiama **"Semblic Content"** (o "Studio
> Contenuti"). Nome da confermare.

## A.1 Cosa deve fare (in una frase)

Dare a una PMI un assistente che impara il **tono di voce** del brand e produce contenuti pronti
(post social, didascalie, email, testi per il sito), con un calendario editoriale, in pochi minuti.

## A.2 Il problema reale

Le piccole imprese sanno di "dover essere sui social" ma non hanno tempo, ne un copywriter. Il
risultato e silenzio, oppure post sciatti e incoerenti. Gli strumenti generici (ChatGPT) chiedono di
ripartire da zero ogni volta e non ricordano il brand.

## A.3 La differenza Semblic (perche non e l'ennesimo wrapper)

1. **Brand voice persistente:** il tono si imposta una volta e vale per tutto.
2. **Privacy by default:** i contenuti e il profilo brand restano lato server dell'utente, non
   addestrano modelli terzi.
3. **Ponte col core:** quando un post chiede un volto o un video, l'utente sceglie un **avatar
   consenziente** del registro Semblic, gia con i diritti a posto. Questo e il cross-sell.

## A.4 Le pagine (MVP)

### 1. Onboarding brand `/business/contenuti/brand`
Si crea il "profilo voce" una volta:
- Nome attivita, settore, pubblico, 3 aggettivi di tono (es. caldo, esperto, ironico).
- Cosa vendi, cosa NON dire mai (parole vietate, claim da evitare).
- Lingua e livello di formalita (tu o lei).
- Opzionale: incolla 2 o 3 testi esistenti, l'AI ne estrae lo stile.

### 2. Generatore `/business/contenuti`  (il cuore)
- Scegli il tipo (post Instagram, post LinkedIn, didascalia, email, testo sito).
- Scrivi un brief breve (es. "promo aperitivo del venerdi").
- L'AI produce 3 varianti, ognuna modificabile, con hashtag e una proposta di immagine.
- Azioni per variante: copia, salva in calendario, rigenera, "rendi piu corto / piu formale".
- Pulsante **"Aggiungi un volto Semblic"**: apre il catalogo avatar consenzienti (ponte col core).
- Pulsante **"Testo in overlay"**: aggiunge una scritta breve sopra l'immagine (es. "Aperti dalle 18")
  come livello modificabile, con limite di caratteri. Vedi A.6.1.

### 3. Calendario `/business/contenuti/calendario`
- Vista mese, i contenuti salvati come schede trascinabili.
- Stato per scheda: bozza, programmato, pubblicato (in MVP pubblicato e manuale).
- Esporta in CSV o copia rapida. (La pubblicazione automatica sui social e fase 2.)

## A.5 Modello dati (Supabase / Postgres)

Tabella `biz_brand_profiles`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk auth) | proprietario |
| business_name | text | |
| sector | text | |
| audience | text | descrizione pubblico |
| tone_adjectives | text[] | es. {caldo, esperto, ironico} |
| formality | text | enum: tu \| lei |
| language | text | es. "it" |
| banned_words | text[] | parole o claim vietati |
| sample_texts | text | testi incollati per estrarre lo stile |
| created_at | timestamptz | default now() |

Tabella `biz_content_items`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| brand_id | uuid (fk) | profilo voce usato |
| channel | text | enum: instagram \| linkedin \| email \| website \| caption |
| brief | text | richiesta dell'utente |
| body | text | testo generato (modificabile) |
| hashtags | text[] | |
| image_suggestion | text | descrizione immagine proposta |
| avatar_id | uuid \| null | se l'utente collega un avatar del core |
| status | text | enum: draft \| scheduled \| published |
| scheduled_for | date \| null | |
| created_at | timestamptz | default now() |

## A.6 Catena AI (come genera)

1. Si costruisce un prompt di sistema dal `biz_brand_profiles` (tono, divieti, lingua).
2. Si aggiunge il brief dell'utente e il canale (ogni canale ha lunghezza e stile suoi).
3. Il modello genera 3 varianti in JSON (body, hashtag, image_suggestion).
4. La chiave del modello sta **solo lato server** (route API), mai nel client.
5. Nessun dato del cliente usato per addestrare modelli terzi.

## A.6.1 Testo in overlay sull'immagine (farlo bene)

Regola tecnica importante: la scritta sull'immagine **non viene generata dentro l'immagine** dal
motore AI. Anche se i modelli sono migliorati sul testo, "cuocere" la scritta nell'immagine fa
perdere il controllo (font, posizione), la modificabilita e il rispetto del limite di caratteri.

Approccio corretto:

1. Il motore genera l'immagine **pulita** (o con spazio libero per il testo).
2. Il testo e un **livello separato** reso da noi (SVG o canvas) col font del brand, sopra l'immagine.
3. In esportazione, immagine e testo si fondono in un unico PNG (pipeline lato server).

Vantaggi: testo sempre leggibile e on-brand, modificabile senza rigenerare l'immagine, limite di
caratteri imposto davvero.

Gestione, niente posizionamento libero ma preset puliti:

- Preset: "Titolo in basso", "Badge nell'angolo", "Nessuno".
- Limite di caratteri per preset (es. titolo max 24, sottotitolo max 40), con contatore live.
- Velo scuro automatico dietro al testo per la leggibilita su qualsiasi immagine.

## A.7 Sinergia col core (il ponte)

Quando l'utente clicca "Aggiungi un volto Semblic", si apre il catalogo avatar **consenzienti**.
Selezionando un avatar, si salva `avatar_id` sul contenuto. In fase 2 questo diventa la base per
generare davvero l'immagine o il video con un motore terzo, pagando la royalty al soggetto. Cosi il
tool business alimenta il core.

## A.8 Criterio di "fatto" (definition of done, MVP)

- [ ] Creo un profilo brand e l'AI ne rispetta tono e parole vietate.
- [ ] Da un brief ottengo 3 varianti coerenti, con hashtag e proposta immagine.
- [ ] Modifico una variante e la salvo nel calendario.
- [ ] Vedo le schede nel calendario per mese e cambio il loro stato.
- [ ] Collego un avatar del catalogo a un contenuto (si salva `avatar_id`).
- [ ] Nessuna chiave AI nel client, tutto via route server.

## A.9 Fuori scope (MVP)

- Pubblicazione automatica sui social (fase 2: API ufficiali Meta e LinkedIn, account business e
  approvazione dell'app lato Meta). In MVP: scarica immagine e copia testo, pubblicazione manuale.
- Generazione reale di immagini e video (fase 2, motori terzi e royalty).
- Analisi delle performance dei post (fase 3).

---

# TOOL B: Preventivi, Proposte e Contratti

## B.1 Cosa deve fare (in una frase)

Trasformare un brief in un **preventivo, una proposta o un contratto** pronto, con modelli per
settore e firma elettronica.

## B.2 Il problema reale

Le PMI perdono ore a riscrivere preventivi e contratti, spesso copiando vecchi file con errori
(date sbagliate, clausole mancanti). Far scrivere un contratto a un legale ogni volta costa troppo.

## B.3 La differenza Semblic

Il DNA del progetto sono **diritti e consenso messi nero su bianco**. Questo tool e l'estensione
naturale verso le PMI: documenti chiari, tracciabili, con firma. Sinergia diretta con i contratti di
consenso del core (stesso motore di template e firma).

## B.4 Le pagine (MVP)

- `/business/documenti/nuovo`: scegli il tipo (preventivo, proposta, contratto di servizio),
  compila i campi guidati (cliente, oggetto, importi, tempi), l'AI redige il testo.
- `/business/documenti`: elenco documenti con stato (bozza, inviato, firmato).
- `/business/documenti/[id]`: anteprima, modifica, invio per firma, esporta PDF.

## B.5 Modello dati (Supabase / Postgres)

Tabella `biz_documents`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| doc_type | text | enum: quote \| proposal \| contract |
| client_name | text | |
| client_email | text | per la firma |
| fields | jsonb | dati strutturati (importi, tempi, oggetto) |
| body | text | testo generato dall'AI |
| status | text | enum: draft \| sent \| signed |
| pdf_url | text \| null | PDF generato |
| signed_at | timestamptz \| null | |
| created_at | timestamptz | default now() |

## B.6 Catena AI e generazione

1. Modelli base per settore (template versionati lato server).
2. L'AI compila il template con i `fields` e adatta il linguaggio.
3. Genera un PDF (riuso della logica gia presente nel progetto per i documenti).
4. **Human in the loop:** disclaimer chiaro che i modelli non sostituiscono un legale, l'utente
   approva prima dell'invio.

## B.7 Criterio di "fatto" (MVP)

- [ ] Da un brief guidato ottengo un preventivo o contratto coerente.
- [ ] Modifico il testo, genero il PDF, lo esporto.
- [ ] Invio per firma e lo stato passa a "firmato" (firma semplice in MVP).
- [ ] I template sono versionati lato server.

## B.8 Fuori scope (MVP)

- Firma qualificata a norma eIDAS avanzata (valutare provider in fase 2).
- Fatturazione e pagamenti (e il Tool 1, separato).
- Integrazione con software gestionali esterni (fase 3).

---

# TOOL C: Analisi Documenti e Compliance GDPR

## C.1 Cosa deve fare (in una frase)

Far caricare a una PMI i propri contratti e policy, evidenziare **rischi e clausole critiche**, e
generare i documenti privacy di base (privacy policy, cookie banner) a norma.

## C.2 Il problema reale

Le PMI italiane sono spesso non conformi al GDPR senza saperlo: privacy policy copiate, cookie banner
sbagliati, contratti con clausole rischiose. La consulenza legale costa e arriva tardi.

## C.3 La differenza Semblic

La **privacy by default e il rispetto delle norme** sono il cuore del progetto. Questo tool porta quel
valore alle aziende. E il piu credibile da vendere proprio perche viene da Semblic.

## C.4 Le pagine (MVP)

- `/business/compliance`: cruscotto con lo stato (cosa manca, cosa e a rischio).
- `/business/compliance/analizza`: carica un documento (contratto, policy), l'AI evidenzia rischi e
  spiega in linguaggio semplice.
- `/business/compliance/genera`: genera privacy policy e cookie banner da un questionario guidato.

## C.5 Modello dati (Supabase / Postgres)

Tabella `biz_compliance_docs`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| owner_id | uuid (fk) | |
| kind | text | enum: uploaded \| generated |
| title | text | |
| source_text | text | testo del documento (lato server) |
| findings | jsonb | elenco rischi: {severita, clausola, spiegazione, suggerimento} |
| generated_type | text \| null | enum: privacy_policy \| cookie_banner |
| created_at | timestamptz | default now() |

## C.6 Catena AI e analisi

1. Estrazione testo (per file caricati, anche da PDF con la logica gia presente nel progetto).
2. L'AI classifica i rischi con severita (alta, media, bassa) e spiega ognuno in modo semplice.
3. Per la generazione: questionario guidato, poi testo a norma con i riferimenti aggiornati.
4. **Dati sensibili lato server**, mai nel client. Possibilita per la versione desktop di lasciare i
   file solo in locale (caso d'uso del "dato che non esce dal PC").

## C.7 Criterio di "fatto" (MVP)

- [ ] Carico un contratto e ottengo un elenco di rischi con severita e spiegazione.
- [ ] Genero una privacy policy e un cookie banner da un questionario.
- [ ] Tutto il testo sensibile resta lato server, niente nel client.
- [ ] Disclaimer chiaro: strumento di supporto, non parere legale.

## C.8 Fuori scope (MVP)

- Aggiornamento automatico al cambiare delle norme (fase 2, va presidiato).
- Registro dei trattamenti completo (fase 2).
- Consulenza umana integrata (eventuale partnership in fase 3).

---

## Nota trasversale ai tre tool

- **Un solo account e un solo wallet Semblic** per core e business.
- **Guardrail comuni:** chiavi AI solo lato server, dati sensibili mai nel client, DPA con i clienti,
  nessun addestramento sui dati del cliente senza consenso, disclaimer di "supporto non sostitutivo"
  su contratti e compliance.
- **Stile dei testi pubblici:** mai trattini lunghi, come da regola di progetto.
