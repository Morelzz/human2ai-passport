# Nemesis: rimozione DMCA assistita (fase 2 di Ward v2)

Data: 2026-06-28. Stato: approvato (Morelz, brainstorm fatto in sessione precedente).
Stile: ADDITIVO su Ward v2, riusa design system e tabelle esistenti, nessuna
ricostruzione. Testi senza trattini lunghi.

## Problema

Ward v2 trova le COPIE delle immagini generate su Semblic e le mostra nel finder
(`app/ward/ContentFinder.tsx`). Oggi l'utente vede la copia ma non puo' farci
niente da dentro Semblic. Manca lo strike: **Nemesis**, che trasforma una copia
confermata in una richiesta di rimozione pronta da inviare.

## Principio guida (non negoziabile)

Semblic **prepara** il documento, l'**utente invia**. Semblic resta uno strumento,
non accusa nessuno e non invia niente in automatico. Disclaimer "non e' consulenza
legale" ovunque compaia il documento.

## Decisioni

1. **Solo DMCA.** Un solo tipo di documento (notice di rimozione per copyright).
   Niente GDPR/diffide/altro in questa fase.
2. **Solo sulle copie confermate.** Il bottone "Avvia rimozione" appare SOLO sulle
   card con `band = 'confirmed'`. Sulle "Da rivedere" no: prima si conferma.
3. **Prove leggere.** Nessuno screenshot pesante in questa fase: URL della copia +
   pagina ospitante + host, certificato di autenticita' + link di verifica, phash,
   data, contatto abuse del dominio via WHOIS/RDAP. (L'interfaccia e' pronta a
   ricevere lo screenshot pesante di `evidence_records` piu' avanti.)
4. **PDF lato client.** Il documento DMCA si genera nel browser con `jsPDF`
   (import dinamico), niente render server, niente file di terzi salvati.
5. **Tracking leggero.** Stato del takedown a gradini: `drafted` (bozza pronta) ->
   `sent` (l'utente segna inviata) -> ricontrollo leggero dell'URL -> `removed`
   (copia sparita) oppure `online` (ancora su). Nessun invio automatico.
6. **Profilo takedown una volta sola.** Nome, indirizzo, email del richiedente
   servono nella DMCA notice. Si chiedono una volta e si salvano in una tabella
   nuova `takedown_profile` (per utente). Migrazione GATED (solo su "applica").
7. **Riuso DB.** Le azioni vivono in `nemesis_actions` (gia' esistente: `kind`,
   `status` default `drafted`, `artifact_path`, `updated_at`).

## Architettura

### 1. Dato: profilo takedown (migrazione gated)
Nuova tabella `takedown_profile`:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null unique` (FK logica su auth.users; un profilo per utente)
- `full_name text not null`
- `address text not null`
- `email text not null`
- `created_at`, `updated_at timestamptz default now()`
- RLS: ON, policy "owner only" (`user_id = auth.uid()`) per select/insert/update.

`nemesis_actions` resta com'e'. Convenzioni d'uso per Nemesis:
- `kind = 'dmca'`
- `status`: `drafted` -> `sent` -> (`removed` | `online`)
- `artifact_path`: null in questa fase (PDF lato client, non si salva).

### 2. Core puro (testabile, DI completa)
Nuovo `lib/ward/takedown.ts`:
- `buildDmcaNotice(input): DmcaNotice` — funzione PURA che assembla la notice da:
  - claimant: `{ fullName, address, email }` (dal profilo);
  - copia: `{ pageUrl, sourceUrl, host }`;
  - opera: `{ alias, certificate, verifyUrl, phash, generatedAt }`;
  - abuse: `WhoisSummary` (registrar/host, per la riga "inviare a").
  Ritorna `{ to, subject, body, claimant, infringingUrl, originalWork }` dove
  `body` e' il testo completo della notice (statement di buona fede, statement di
  accuratezza sotto pena di falso, identificazione opera + copia, firma). Nessuna
  I/O. Una sola fonte di verita' del testo (la usano sia il preview UI sia il PDF).
- `nextTakedownStatus(current, event): TakedownStatus` — macchina a stati PURA:
  - `drafted` + `send` -> `sent`
  - `sent` + `recheck-gone` -> `removed`
  - `sent` + `recheck-online` -> `online`
  - `online` + `recheck-gone` -> `removed` (si puo' ricontrollare ancora)
  - transizioni non valide -> lancia (guardia esplicita).
- `classifyRecheck(httpStatus | null): 'gone' | 'online'` — PURA: 404/410/null
  (dead) -> `gone`; 200..399 -> `online`; altri -> `online` (prudente: non
  dichiarare rimosso senza certezza).

### 3. Repo (Supabase, service role)
Nuovo `lib/ward/takedown-repo.ts`:
- `getProfile(userId): Promise<TakedownProfile | null>`
- `upsertProfile(userId, { fullName, address, email }): Promise<void>`
- `createAction(scanMatchId): Promise<{ id, status }>` (kind='dmca', status='drafted')
- `updateActionStatus(actionId, status): Promise<void>` (+ updated_at)
- `getAction(actionId): Promise<{ id, scanMatchId, status } | null>`

### 4. Route (auth + ownership + confirmed-only)
Ownership Ward v2 = BUYER della generazione: `scan_match -> scan_job ->
generation.buyer_id == user.id` (come `/api/ward/content-scan`, NON `avatar.owner_id`).

- `GET /api/ward/takedown-profile` -> profilo dell'utente o `{ profile: null }`.
- `POST /api/ward/takedown-profile` `{ fullName, address, email }` -> valida non
  vuoti + email plausibile, upsert, 200. Rate-limit per utente.
- `POST /api/ward/takedown` `{ matchId }`:
  - auth; ownership via buyer; rate-limit;
  - match deve esistere ed essere `band = 'confirmed'`, altrimenti 422;
  - se manca il profilo -> 409 `{ error, needsProfile: true }`;
  - risolve opera (alias generazione, certificate del match, phash, data) +
    `rdapLookup(host)` per l'abuse contact;
  - `createAction(matchId)` (drafted) + `buildDmcaNotice(...)`;
  - ritorna `{ ok: true, actionId, status, notice }`. Il PDF lo fa il client.
- `POST /api/ward/takedown/status` `{ actionId, event }` con `event` in
  `send | recheck`:
  - ownership dell'azione via match -> generation buyer;
  - `send` -> `updateActionStatus(sent)`;
  - `recheck` -> fetch leggero (HEAD/GET best-effort) dell'URL della copia,
    `classifyRecheck` -> `nextTakedownStatus` -> update -> ritorna nuovo stato.

### 5. PDF lato client
Nuovo `app/ward/dmca-pdf.ts` (client): `downloadDmcaPdf(notice)` con
`const { jsPDF } = await import("jspdf")`. Rende `notice.body` impaginato + intestazione
Semblic + footer disclaimer "Questo documento non e' consulenza legale". Nome file
`dmca-${host}.pdf`. `jspdf` come dependency nuova.

### 6. UI (additiva, mockup-first, mobile = desktop)
- `app/ward/ContentFinder.tsx`, `Card`: se `m.band === 'confirmed'` aggiungi un
  bottone Amber pieno **"Avvia rimozione"** accanto ad "Apri"/"Segna sicuro".
  Sulle "Da rivedere" non compare.
- Nuovo `app/ward/Takedown.tsx` (client), pannello/modale a gradini:
  - **Step profilo** (solo se 409 needsProfile): form nome + indirizzo + email,
    salva una volta, poi prosegue.
  - **Step documento**: anteprima della notice (`notice.body`), riga "Da inviare a"
    (abuse contact), bottone **"Scarica PDF"**, disclaimer non-consulenza-legale.
  - **Step tracking**: "Ho inviato la richiesta" -> stato `sent`; "Ricontrolla la
    copia" -> `removed` (badge salvia "Rimossa") oppure `online` (badge coral
    "Ancora online"). Stato persistito su `nemesis_actions`.
- Estetica: token SEMBLIC (Amber azione, salvia ok, coral allerta), pillole,
  hairline. Verifica su mobile e desktop.

## Sicurezza e privacy
- Ownership sempre lato server (buyer della generazione), mai dal client.
- `sensitivity = 'minor'` (child-safety): il takedown NON e' disponibile (403),
  come per `/api/ward/evidence`.
- Recheck URL = fetch best-effort con timeout, nessun dato salvato, solo lo stato.
- Profilo: dati personali del richiedente solo lato server, RLS owner-only.
- Disclaimer legale visibile su anteprima e PDF.

## Fuori scope (esplicito)
- Invio automatico della notice (mai).
- Screenshot pesante / ancoraggio prove (gia' predisposto, fase successiva).
- Tipi di documento diversi dal DMCA.
- Notifiche/email verso il destinatario.

## Test (vitest, come il resto di Ward)
- `lib/ward/takedown.test.ts`: `buildDmcaNotice` (campi e presenza degli statement
  obbligatori), `nextTakedownStatus` (tutte le transizioni + invalida che lancia),
  `classifyRecheck` (gone/online/prudenza).
- Route: coperte dai test di dominio + verifica manuale in preview (ownership,
  confirmed-only, needsProfile) come le altre route Ward.
