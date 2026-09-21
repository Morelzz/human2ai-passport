# SEMBLIC: Revisione dei copy del sito (per Claude Code)

Revisione completa dei testi, pagina per pagina. Obiettivo: correggere i copy deboli, le incoerenze
e i refusi, mantenendo la voce forte che il sito ha gia. Data: 2026-06-18.

## 0. Come usare questo documento

Per ogni voce trovi "Attuale" (cosa c'e e perche non va) e "Nuovo" (il testo da mettere, verbatim).
Dove un copy e gia forte e scritto "Tieni". Applica i fix globali (sezione 3) su tutto il sito, poi
le correzioni pagina per pagina (sezione 4) e le FAQ (sezione 5). Nessun trattino lungo nei testi.

## 1. Valutazione sintetica

Il sito ha una voce editoriale, premium e riconoscibile, con slogan eccellenti ("Persone, non
prompt.", "La prova e parte del prodotto.", "Chi mette il volto non paga: guadagna."). Il problema
non e il tono, sono cinque cose ricorrenti:

1. Refusi tipografici: in `/proteggi` accenti e apostrofi resi come caratteri dritti ("perche'",
   "e'", "puo'", "gia'"). In `content/faq.ts` ci sono trattini lunghi, vietati dalla regola di stile.
2. Segnaposto non finalizzati visibili al pubblico: in `/contatti` ("hello@semblic.example",
   due "DA CONFERMARE"), e in `/scansione` un parametro "DA MORELZ".
3. Incoerenze: "passport" e "passaporto" usati a caso; CTA come "Verifica" e "Verifica un contenuto";
   etichette che dicono "registro/avatar" ma portano al motore di generazione.
4. Gergo non spiegato: SOUL, HUMAN, SHAPE, SPARK, Capture Partner, KYB, roster, best effort.
5. Tre scivoloni di tono che rompono il premium: l'H1 di `/partner` ("L'AI ti ha tolto lavoro?"),
   "non una marchetta" sempre in `/partner`, e "ENFORCEMENT" come occhiello di `/report`.

Tutto il resto si tiene. Sotto, i fix puntuali.

## 2. Regole di voce (guardrail)

- Premium, asciutto, editoriale. Niente esclamativi, niente marketing urlato.
- Mai trattini lunghi: usare virgole, due punti o parentesi.
- Italiano corretto, con accenti e apostrofi tipografici giusti.
- Una sola CTA primaria per schermata. Le secondarie sono piu leggere.
- Spiega il gergo al primo uso, in mezza riga. Il lettore non deve cercare altrove.
- L'etichetta di una CTA deve dire dove porta.

## 3. Fix globali (su tutto il sito)

### 3.1 Tipografia e accenti

In `/proteggi` (e ovunque compaiano) sostituire i caratteri dritti con gli accentati corretti:
perche', e', puo', gia', poi diventano: perche, e, puo, gia con accento corretto (perché, è, può, già).
Controllare anche le virgolette: usare uno stile unico in tutto il sito (preferire le doppie dritte
oppure le caporali, ma una sola scelta).

### 3.2 Errori di autenticazione (localizzazione)

In `/login` e `/signup` gli errori arrivano grezzi da Supabase, in inglese. Mappare i piu comuni:

| Errore Supabase | Testo italiano |
|---|---|
| Invalid login credentials | Email o password non corretti. |
| User already registered | Esiste gia un account con questa email. Accedi. |
| Email not confirmed | Conferma prima la tua email: ti abbiamo inviato un link. |
| Password should be at least 6 characters | La password deve avere almeno 6 caratteri. |
| (fallback) | Qualcosa non ha funzionato. Riprova tra poco. |

In `/login` aggiungere il link "Password dimenticata?" (oggi manca).

### 3.3 Terminologia

- Volto del registro: usare sempre "passaporto pubblico" nei testi rivolti all'utente. "Passport"
  resta solo come nome tecnico della rotta, mai nel copy visibile.
- Tier, spiegarli al primo uso con mezza riga: "SPARK e SHAPE sono ispirati a te; SOUL e HUMAN sono
  identici a te, con l'identita bloccata sulle tue foto reali."
- KYB: alla prima occorrenza scrivere "la verifica dell'azienda (KYB)".
- Evitare "best effort", "roster", "workflow con gli LLM" nei testi pubblici: vedi sostituzioni sotto.

### 3.4 CTA e destinazioni

Allineare etichetta e destinazione:

- Verso `/match` (genera): usare verbi di creazione, "Genera", "Genera con un volto reale", "Trova un volto".
- Verso `/catalogo` (sfoglia il registro): usare "Sfoglia il registro", "Vedi tutti i volti".
- Oggi diverse CTA dicono "Esplora il registro / Esplora tutti i volti / Avatar" ma puntano a `/match`:
  o si cambia l'etichetta (se la destinazione resta la generazione) o si punta a `/catalogo`.

### 3.5 Segnaposto da finalizzare

- `/contatti`: sostituire "hello@semblic.example" con l'indirizzo reale, e completare i due
  "DA CONFERMARE" (email e indirizzo) prima del pubblico. Finche non sono definiti, non mostrarli.
- `/scansione`: il blocco "Parametri minimi: DA MORELZ" resta solo in sviluppo, mai in produzione.

## 4. Revisione pagina per pagina

### Home (`app/page.tsx` e componenti marketing)
Copy forte, tieni hero, manifesto, "Persone, non prompt.", roadmap. Nota strutturale gia data a parte
(home troppo lunga, da snellire). Sul copy: il payoff "Real Humans, Real Rights, Real Earnings"
compare nell'hero e di nuovo a chiusura del Manifesto: tienilo una volta sola, nell'hero.

### `/partner`
- Attuale H1: usa un gancio negativo da clickbait ("L'AI ti ha tolto lavoro?").
- Nuovo H1: "Sei tu a portare le persone vere dentro l'AI."
- Occhiello opzionale sopra l'H1: "Per fotografi e videomaker".
- Attuale: titolo sezione "Tre flussi, non una marchetta." (colloquiale, fuori tono).
- Nuovo: "Tre flussi di guadagno, reali."
- Tieni il resto. Aggiungi un ordine di grandezza ai compensi appena possibile: oggi sono solo "un
  compenso" e "una percentuale", onesti ma poco motivanti.

### `/report`
- Attuale occhiello: "ENFORCEMENT" (inglese, freddo).
- Nuovo: "Tutela".
- Attuale: label tutte in maiuscolo burocratico ("LA TUA EMAIL (OPZIONALE, PER RICONTATTO)").
- Nuovo (sentence case): "Avatar (handle)", "Certificato del contenuto (facoltativo)", "Motivo",
  "Dettagli (facoltativo)", "La tua email (facoltativa, per ricontatto)".
- Placeholder handle: da "@random" a un esempio leggibile, es. "@mario-r".

### `/signup`
- Attuale: tipi account "Compratore / Creatore / Azienda" (Compratore e freddo).
- Nuovo: "Genero contenuti" (buyer), "Metto il mio volto" (seller), "Sono un'agenzia" (enterprise).
- Righe d'aiuto: tieni quelle attuali, funzionano.
- Aggiungi un occhiello sopra il titolo: "Crea il tuo account" resta H1, sopra: "Un account, due strade".
- Localizza gli errori (vedi 3.2).

### `/login`
- Tieni. Solo: localizza gli errori e aggiungi "Password dimenticata?".

### `/prezzi`
- Attuale: nella card di chi genera il prezzo e "a consumo" e compare "Pacchetti di crediti in
  definizione" (segnala un prodotto incompleto).
- Nuovo prezzo card buyer: lascia "a consumo" come parola, ma sotto aggiungi una riga chiara:
  "Paghi solo quando generi, in base alla categoria d'uso. Nessun abbonamento."
- Sostituisci "Pacchetti di crediti in definizione, oggi paghi a consumo, senza abbonamento." con:
  "Oggi paghi a consumo, senza abbonamento. I pacchetti di crediti arrivano presto."
- Tieni "Chi mette il volto non paga: guadagna." e le bande.

### `/academy`
- Attuale: tutti i corsi risultano "In preparazione" e non c'e un'azione per l'utente.
- Nuovo: per ogni corso non ancora attivo, CTA "Avvisami quando apre" (raccoglie l'email). Cosi la
  pagina fa qualcosa anche prima del lancio.
- Attuale descrizione corso medio: "workflow creativi con gli LLM" (gergo).
- Nuovo: "come scrivere richieste efficaci e usare bene la piattaforma."
- Tieni l'H1 "Capire i propri diritti e il primo modo di possederli."

### `/enterprise` e `/enterprise/register`
- Glossa il gergo al primo uso: "la verifica dell'azienda (KYB)", e per "roster" usa "i tuoi volti".
- Attuale label: "Partita IVA / Reg. number *" (mischia italiano e inglese).
- Nuovo: "Partita IVA o codice identificativo aziendale *".
- Hero con doppia CTA ("Riserva un volto" e "Registra la tua agenzia"): tieni una primaria
  ("Riserva un volto") e rendi la seconda un link leggero sotto, non un secondo bottone forte.
- Tieni "La persona non si vende: concede." e "Esclusiva di categoria, mai esclusiva della persona."
  (ma evita di ribadire lo stesso concetto etico due volte di fila: togli o accorcia "I principi non
  si comprano").

### `/trasparenza`
- Attuale: "questi sono i numeri del registro, letti in tempo reale" rischia di indebolirsi se i
  numeri sono a zero (fase iniziale).
- Nuovo (regge anche a zero), riga sotto l'H1: "Questi sono i numeri reali del registro, aggiornati
  in tempo reale. Il registro e appena partito: ogni numero qui cresce in pubblico."
- "SIAE dei volti umani": tienila per il pubblico italiano, ma aggiungi mezza riga di glossa:
  "una gestione collettiva dei diritti d'immagine, come una societa di gestione dei diritti."

### `/proteggi`
- Fix accenti (vedi 3.1): "perche", "e", "puo", "gia" con accento corretto in tutto il testo.
- Attuale: "in revisione legale" e ripetuto tre volte. Tienilo una volta sola, come nota a fondo box.
- Attuale: "best effort" nel testo italiano.
- Nuovo: invece di "best effort", scrivere "per quanto possibile". La frase diventa: "Dentro Semblic
  la non generazione e una garanzia. Fuori, offriamo allerta precoce e rimozione assistita, per quanto
  possibile: un impegno serio, non la promessa che il tuo volto non compaia mai altrove."
- La distinzione "garanzia dentro / impegno fuori" va detta una volta sola, chiara, non tre.

### `/verify`
- La nota privacy del portale e corretta ma troppo lunga e tecnica. Tieni una versione breve sempre
  visibile e sposta il resto sotto "Come trattiamo la tua immagine".
- Versione breve nuova: "L'analisi del volto avviene sul tuo dispositivo: al nostro server arriva
  solo un codice numerico, mai conservato. La filigrana vive nei PNG originali scaricati da Semblic,
  screenshot e ricompressioni possono cancellarla."
- Tieni gli esiti, ma il concetto "indizio, mai una prova" dillo una volta nel disclaimer fisso,
  non in tre punti diversi.

### `/contatti`
- Finalizza i recapiti (vedi 3.5). Email reale, indirizzo completo, oppure nascondi finche non ci sono.
- Tieni "Parliamone. Da persone." (buono). Sotto, aggiungi l'aggancio al valore:
  "Rispondiamo noi, persone vere, come il registro che costruiamo."

### `/scansione` e `/scansione/prenota`
- Contraddizione sul pagamento: il bottone dice "Prenota la sessione, 99,00 euro" e l'esito dice
  "Pagamento ricevuto", ma altrove "si salda in studio". Finche il pagamento online non c'e, allinea:
  - Bottone: "Richiedi la sessione".
  - Box prezzo: "99 euro, prezzo di lancio. Si salda in studio."
  - Esito positivo: "Richiesta ricevuta. Sessione da confermare, ti scriviamo noi."
- "vieni come sei" e bellissima ma ripetuta troppe volte: tienila una volta nell'hero del booking e
  una nel promemoria, non a ogni stato.
- `/scansione` e molto lunga: asciuga le aperture aforistiche in serie ("l'ombra nasconde", "il tempo
  passa tu resti", "se non sei tu non esce"): tienine due, le piu forti.

### `/catalogo`
- Pagina povera di copy: aggiungi una riga di valore sotto l'H1, per chi arriva nuovo:
  "Ogni volto e una persona reale che ha acconsentito, per le categorie che vedi dichiarate. Tocca un
  volto per il suo passaporto pubblico." (la prima parte oggi manca).
- Tieni lo stato vuoto "Le persone arrivano prima dell'AI." (forte).

### `/blog` e `/blog/[slug]`
- Testata forte, tieni.
- Attuale CTA di chiusura articolo: "Esplora il Registro Volti" che punta a `/match` (genera).
- Nuovo: o etichetta "Genera con un volto reale" (se resta `/match`), oppure punta a `/catalogo` con
  "Sfoglia il registro". Allinea label e destinazione.
- ShareBar: l'etichetta nuda "X" e ambigua. Usa "X (Twitter)".

### `/badge`
- Tieni. Solo: spiega "passaporto" invece di "passport" nel link "Vai al passport". Placeholder
  handle da "random" a "mario-r".

### Navbar (`components/marketing/Navbar.tsx`)
- Unifica la CTA: sempre "Verifica un contenuto" (oggi desktop dice solo "Verifica").
- Voce "Avatar" che porta a `/catalogo`: rinominala "Registro" (piu chiara e on-brand). "Genera"
  verso `/match` va bene.

### Registry (home, "Volti in evidenza")
- Tieni "Persone, non prompt." e "Ogni volto qui e una persona vera, consenziente e pagata."
- Le due CTA quasi identiche ("Esplora tutti i {n}" in alto e "Esplora tutti i {n} volti" in fondo):
  varia, in alto "Vedi tutti i {n}", in fondo "Sfoglia il registro completo".

## 5. FAQ riscritte (senza trattini lunghi)

In `content/faq.ts` tre risposte usano trattini lunghi. Sostituirle con queste versioni. Le altre
risposte vanno bene cosi, solo uniformare "passaporto" (non "passport") e "report di trasparenza".

- D: Cos'e Semblic, in una frase?
  R: "E il registro dei diritti d'immagine: il filtro che impedisce all'AI di generare un essere umano
  senza il consenso della persona reale, un consenso verificato e pagato."

- D: Chi puo usare il mio volto, e per cosa?
  R: "Solo chi passa dal filtro, e solo nelle categorie che hai approvato tu. Se una richiesta cade in
  una categoria che non concedi, viene bloccata, e il blocco viene contato pubblicamente nel nostro
  report di trasparenza."

- D: Cosa succede se qualcuno usa il mio volto senza permesso?
  R: "Lo segnali tu, o chiunque altro, dal passaporto o da /report. Ogni segnalazione apre un flusso
  di verifica tracciato che puo portare alla rimozione e alla sospensione. Un contenuto senza
  certificato non e un contenuto Semblic."

## 6. Checklist per Claude Code

- [ ] Rimuovere tutti i trattini lunghi dai testi pubblici (in particolare `content/faq.ts`).
- [ ] Correggere gli accenti e gli apostrofi in `/proteggi`.
- [ ] Localizzare gli errori di autenticazione e aggiungere "Password dimenticata?".
- [ ] Uniformare "passaporto" e la CTA "Verifica un contenuto".
- [ ] Allineare le etichette delle CTA alle loro destinazioni (genera vs sfoglia).
- [ ] Applicare le nuove stringhe pagina per pagina (sezione 4).
- [ ] Finalizzare i segnaposto in `/contatti` e togliere "DA MORELZ" dalla produzione.
- [ ] Sciogliere il gergo al primo uso (tier, KYB).
- [ ] Risolvere la contraddizione sul pagamento in `/scansione/prenota`.
