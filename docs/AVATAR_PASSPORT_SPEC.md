# AVATAR PASSPORT — Spec del modulo

Il primo modulo costruibile di Human2AI. Obiettivo: dimostrare la tesi "registro dei diritti
verificabile" con qualcosa di vivo e pubblico. Dati DEMO.

---

## 1. Cosa deve fare (in una frase)

Mostrare pubblicamente che un volto reale esiste nel registro, con quali permessi può essere
usato, e dare a chiunque il modo di **verificare** quella credenziale tramite un token.

---

## 2. Le pagine (4 in tutto)

### A. Landing `/`
- Hero a tutto schermo, dark, estetica Obsidian Intelligence.
- Headline forte: il registro dove la tua identità diventa un diritto verificabile.
- Sottotitolo: spiega in 1 frase che Human2AI tutela le persone reali nell'era dell'AI.
- Una griglia/carosello dei volti demo (card cliccabili → vanno al Passport).
- CTA secondaria: "Verifica un contenuto" → `/verify`.

### B. Avatar Passport pubblico `/passport/[handle]`  ← IL CUORE
La pagina pubblica di un singolo avatar. Deve sembrare un documento d'identità premium, vivo.
Mostra:
- Foto/ritratto dell'avatar (placeholder demo va bene).
- Alias pubblico + handle (es. `@mario-r`).
- **Badge "Human2AI Verified"** (scudo + spunta) ben visibile.
- **Livello** dell'avatar (SPARK / SHAPE / SOUL / HUMAN) con colore dedicato.
- **Token** dell'avatar (hash SHA-256 troncato, con bottone "copia" e "verifica").
- **Timeline di consenso**: "Autorizzato dal GG/MM/AAAA" → eventuale "Revocato dal …".
  Stato attuale grande e chiaro: ATTIVO / REVOCATO / IN VERIFICA.
- **Categorie consentite** (chip verdi) e **categorie escluse** (chip rosse/barrate).
- **Contatore utilizzi** (numero di generazioni che hanno usato questo avatar — demo).
- Nota legale breve: "Questo soggetto è una persona reale che ha dato consenso esplicito.
  Ogni utilizzo genera una royalty a suo favore."

### C. Verifica `/verify`
- Campo dove incollare un token.
- Bottone "Verifica".
- Risultato: VALIDO (mostra a quale avatar appartiene, stato consenso a quella data) oppure
  NON VALIDO / NON TROVATO.
- Questo è l'embrione del futuro "Provenance-as-a-Service".

### D. (Opzionale, se avanza tempo) Dashboard avatar `/me`
- Vista del singolo soggetto sul proprio passport: stato, categorie, utilizzi, "royalty maturate" (demo).
- Bottone "Revoca una categoria" che aggiorna la timeline (dimostra la revoca prospettica).
- NIENTE autenticazione vera in questa fase — si può simulare scegliendo un avatar demo.

---

## 3. Modello dati (Supabase / Postgres)

Tabella `avatars`:

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| handle | text unique | es. "mario-r", usato nell'URL |
| alias | text | nome pubblico, es. "Mario R." |
| portrait_url | text | URL ritratto (placeholder demo) |
| tier | text | enum: SPARK \| SHAPE \| SOUL \| HUMAN |
| gender | text | |
| age_range | text | es. "30-40" |
| ethnicity | text | |
| hair_color | text | |
| body_type | text | |
| approved_categories | text[] | es. {Food, Fashion, Sport} |
| excluded_categories | text[] | es. {Politics, Alcohol} |
| consent_start | date | inizio autorizzazione |
| consent_end | date \| null | fine autorizzazione (null = a tempo indeterminato) |
| revoked_at | date \| null | se valorizzato → stato REVOCATO |
| token_hash | text | SHA-256, vedi sotto |
| usage_count | int | demo |
| royalty_accrued_cents | int | demo, in centesimi (wallet ad accumulo) |
| is_demo | bool | true per i dati demo |
| created_at | timestamptz | default now() |

Tabella `consent_events` (per la timeline — semplice):

| campo | tipo | note |
|---|---|---|
| id | uuid (pk) | |
| avatar_id | uuid (fk) | |
| event_type | text | enum: GRANTED \| CATEGORY_ADDED \| CATEGORY_REMOVED \| REVOKED |
| detail | text | es. nome categoria |
| occurred_at | date | |

### Generazione del token (token_hash)

`token_hash = SHA256( id + "|" + consent_start + "|" + JSON(approved_categories) )`

- Deterministico: dato lo stesso avatar+consenso, ridà lo stesso hash → la verifica funziona ricalcolando.
- Mostrare all'utente solo i primi ~16 caratteri + "…", con copia integrale al click.
- **Nessun dato biometrico nell'hash.** Solo id + termini di consenso.

---

## 4. Logica di verifica (`/verify`)

1. L'utente incolla un token (hash completo).
2. Il backend cerca un avatar con quel `token_hash`.
3. Se trovato → ricalcola l'hash dai dati attuali e conferma che combacia → mostra VALIDO +
   alias + stato consenso (ATTIVO/REVOCATO) + data.
4. Se non trovato → NON VALIDO.

> Nota: in questa fase la verifica è centralizzata (DB). L'ancoraggio on-chain dell'hash è un
> trimestre futuro (Q3). NON implementarlo ora.

---

## 5. Dati DEMO (6 avatar)

Da inserire in un seed (`supabase/seed.sql` o uno script TS). Ritratti: usa placeholder neutri
(es. servizio di avatar generici o silhouette stilizzate coerenti col tema dark). NON usare foto
di persone reali.

1. **Mario R.** — handle `mario-r` — SOUL — uomo, 30-40, italiano, capelli castani, atletico.
   Consentite: Food, Fashion, Travel. Escluse: Politics, Alcohol. Consenso dal 2026-01-10. Attivo.
   usage 142, royalty 1880 cent.
2. **Giulia V.** — handle `giulia-v` — HUMAN — donna, 25-35, italiana, capelli biondi, slim.
   Consentite: Beauty, Fashion, Lifestyle, Business. Escluse: Healthcare. Dal 2026-02-01. Attivo.
   usage 308, royalty 5120 cent.
3. **Kenji T.** — handle `kenji-t` — SHAPE — uomo, 20-30, giapponese, capelli neri, slim.
   Consentite: Sport, Travel, Entertainment. Escluse: Politics. Dal 2026-03-05. Attivo.
   usage 67, royalty 540 cent.
4. **Amara N.** — handle `amara-n` — SOUL — donna, 30-40, nigeriana, capelli neri, curvy.
   Consentite: Fashion, Beauty, Business, Luxury. Escluse: Alcohol. Dal 2026-01-20. Attivo.
   usage 195, royalty 2730 cent.
5. **Luca B.** — handle `luca-b` — SPARK — uomo, 40-50, italiano, brizzolato, robusto.
   Consentite: Food, Business. Escluse: Sport, Entertainment. Dal 2025-12-15. Attivo. usage 23, royalty 90 cent.
6. **Sofia M.** — handle `sofia-m` — HUMAN — donna, 50-60, spagnola, capelli grigi, normale.
   Consentite: Healthcare, Business, Lifestyle. Escluse: Fashion, Beauty.
   Dal 2025-11-01, **revocato dal 2026-05-01** (per dimostrare lo stato REVOCATO e la timeline).
   usage 88, royalty 1240 cent.

Categorie standard del sistema (per i chip):
`Food, Fashion, Sport, Luxury, Business, Beauty, Entertainment, Travel, Healthcare, Politics, Alcohol`

---

## 6. Criterio di "fatto" (definition of done)

- [ ] Apro `/` e vedo i 6 volti demo, dark e premium.
- [ ] Clicco un volto → vedo il suo Passport con token, timeline, categorie, badge Verified.
- [ ] Sofia M. mostra chiaramente lo stato REVOCATO con la timeline.
- [ ] Copio il token di Mario, lo incollo in `/verify` → risulta VALIDO con i suoi dati.
- [ ] Incollo un token a caso in `/verify` → risulta NON VALIDO.
- [ ] Nessun segreto nel client; Supabase configurato via env.

---

## 7. Cosa NON fare ora (fuori scope)

- Generazione immagini / chiamate ai motori AI.
- Pagamenti reali / Stripe.
- KYC / verifica documenti NFC.
- Blockchain / ancoraggio on-chain.
- Autenticazione utente completa.
- I 4 livelli come flusso d'ingresso (selfie/studio).

Tutto questo arriva nei trimestri successivi. Ora: solo il Registro Volti vivo e verificabile.
