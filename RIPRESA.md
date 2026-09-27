# Ripresa del lavoro (27 settembre 2026, notte)

Questo file serve a chi riprende il lavoro su Semblic in un'altra sessione (anche in cloud). Si legge per primo.

## Le regole di lavoro con Morelz

- Si scrive sempre in italiano, anche in chat. Mai trattini lunghi (niente em dash o en dash), nemmeno nei testi.
- La prima riga di ogni risposta dice il modello ("Sono Opus 5.5").
- Online va solo quando Morelz scrive **"pubblica"**. Un push su `master` pubblica il sito (Vercel), quindi su `master` non si spinge niente senza quella parola. Il lavoro in corso vive sul ramo `notte-27-settembre`.
- Per ogni modifica dell'interfaccia prima un mockup (cartella `design/`), poi il codice dopo il suo ok.
- Ogni cosa nuova si prova su computer e telefono, con transizioni ed effetti curati (mai aria "fatta dall'AI"), rispettando "riduci animazioni".
- Le spiegazioni visive si fanno con foto vere del nostro motore, mai con disegnini fatti a mano.
- Le cose tecniche le fa Claude: niente liste di compiti tecnici per Morelz. Le modifiche al database Supabase le applica Claude (dal pannello SQL).
- I prezzi sono veri e calcolati, mai inventati. Le regole scritte dalle persone del registro non si pubblicano mai.
- Sul telefono le liste lunghe scorrono di lato, niente colonne infinite.
- Alla fine di ogni risposta il link locale: http://localhost:3000

## Cosa c'e' su questo ramo e non e' ancora online

In ordine, tutti provati in locale:

1. VOLT a porta chiusa: se il conteggio dei VOLT si rompe, lo scatto non parte (codice `volt_errore`).
2. Tetti al minuto su `/api/match`, `/api/avatar/analyze`, `/api/edit/interpret`.
3. Il misuratore del volto SFace (`lib/arcface.ts`, onnxruntime-node): soglia 0,5; uno scatto con un volto che non e' la persona non si consegna. Dopo la pubblicazione va controllato che il worker su Railway scarichi il modello e che si generi normalmente.
4. **Il direttore** in Crea (`lib/direttore.ts`, `/api/crea/direttore`): legge la frase e accende le pillole con la scintilla.
5. **Le ricette** (`lib/ricette.ts`, `/api/ricette`, `app/match/crea/Ricette.tsx`). La tabella `ricette` e' GIA' creata sul database (`supabase/ricette.sql`).
6. **La serie per campagna** (`app/match/crea/Serie.tsx`): da 2 a 6 situazioni, il primo scatto riuscito fa da guida agli altri (ruolo `serie` in `lib/echo-prompt.ts`, che lavora nel worker e quindi si vede solo dopo la pubblicazione).
7. Messaggio onesto quando finisce il credito OpenAI (`lib/engines/echo.ts`).

## Problema aperto, urgente

Il 27/9 sera il credito OpenAI e' finito (`credit_balance_exhausted`): nessuno puo' generare foto finche' Morelz non lo ricarica. Il pagamento lo fa lui.

## Il prossimo lavoro: gli angoli di ripresa

Mockup in `design/angoli/index.html` (foto vere in `design/angoli/foto/`), nato da un reel sui 34 tipi di inquadratura. Quattro pezzi, in attesa della scelta di Morelz:

- A. La pillola **Angolo** in Crea (20 angoli in tre famiglie, ogni carta una foto vera).
- B. La **serie di angoli**: stessa scena, fino a sei camere.
- C. Il direttore che riconosce gli angoli nella frase.
- D. La vetrina "Chiara, venti camere".

Mancano 6 foto (soggettiva, di spalle, selfie, fuoco dietro, riflesso, da un buco): si generano quando torna il credito OpenAI, con le stesse frasi usate per le altre (Chiara, cappotto color cammello, via del centro storico, cambia solo la camera). Il motore rispetta bene gli angoli scritti con precisione: volto misurato fra 88 e 93%.

## Cosa serve in cloud

Le chiavi segrete non sono nel repository. Senza le variabili d'ambiente (Supabase, OpenAI, Anthropic) in cloud si scrive codice, si fanno girare test (`npx vitest run`), tipi (`npx tsc --noEmit`) e build, ma non si genera e non si prova col database vero.
