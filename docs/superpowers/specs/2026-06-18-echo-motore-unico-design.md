# ECHO motore unico — design

Data: 2026-06-18

## Obiettivo

ECHO (gpt-image-2, identity-lock) diventa l'**unico motore di generazione** del sito.
Il ramo Higgsfield/Soul (modelli HUMAN e SHAPE piu i 12 stili Soul) sparisce
dall'interfaccia di generazione; il badge dell'avatar mostra "ECHO"; il codice
Higgsfield resta in repo ma dormiente (reversibile), non viene cancellato.

Richiesta esplicita di Morelz: "nei modelli deve rimanere soltanto ECHO per ogni
singolo avatar, HUMAN e SHAPE disattivate per tutto il sito".

## Contesto attuale (stato verificato a terra)

Le parole SPARK/SHAPE/SOUL/HUMAN compaiono in TRE punti distinti:

1. **Selettore motore/modello in `/match`** (`app/match/MatchClient.tsx`): l'utente
   sceglie il motore `higgsfield` (Soul: modelli HUMAN = `soul-v2`, SHAPE = `soul-id`,
   piu 12 stili Soul) oppure `echo` (gpt-image-2). Default oggi: `higgsfield`.
2. **Badge tier sull'avatar** (`lib/types.ts` `TIER_CONFIG`, reso in catalogo,
   passaporto, registro, card, OG image): tutti gli avatar sono tier `SOUL`, quindi
   il badge mostra "SOUL" ovunque. E la fedelta dell'avatar, concetto distinto dal motore.
3. **Etichetta sul contenuto generato** (`generations.tier`, filtro in "i miei
   contenuti"): segna il motore usato ("ECHO"/"HUMAN"/"SHAPE").

Backend: l'unico motore realmente implementato in `lib/engines/` e ECHO
(`echo.ts`). Higgsfield vive in `lib/higgsfield.ts` + `lib/soul-models.ts`.

## Modifiche per superficie

### 1. `/match` (MatchClient.tsx) — UI generazione
- Rimuovere il **toggle motore** (Higgsfield/ECHO): il motore e fisso `echo`.
- Rimuovere il **selettore modelli** HUMAN/SHAPE (`SOUL_MODELS`) e gli **stili Soul** (`SOUL_STYLES`).
- Rimuovere lo stato/derivati legati a Higgsfield (`model`, `styleId`, `modelSupportsStyles`).
- Restano i controlli ECHO gia esistenti: formato, risoluzione, qualita, immagini
  extra del cliente, libreria pose. Il default `engine` diventa `echo`.
- Flusso utente: scegli avatar → scrivi scena → opzioni ECHO → genera.

### 2. `/api/generate/route.ts` — backend
- Forzare `useEcho = true` sempre (ignorare `body.engine`): ogni generazione passa
  da `generateEcho`. Il ramo `generateWithHiggsfield` resta nel file ma irraggiungibile.
- L'etichetta del contenuto generato (`meta.tier`, `tierLabel`) = sempre "ECHO".
- Nessuna modifica all'economia ECHO (`splitEcho`, supplemento compute invariati).

### 3. Badge avatar → "ECHO"
- In `lib/types.ts` cambiare l'etichetta del tier SOUL: `TIER_CONFIG.SOUL.label = "ECHO"`.
  Tutti gli avatar sono SOUL, quindi il badge mostra "ECHO" ovunque (catalogo,
  passaporto, registro, card, OG image) con una sola modifica. Colori e stile invariati.
- Le voci SPARK/SHAPE/HUMAN di `TIER_CONFIG` restano (nessun avatar le usa), per non
  rompere il tipo `Tier` ne i componenti che indicizzano la mappa.

### 4. Codice dormiente
- `lib/higgsfield.ts` e `lib/soul-models.ts` restano in repo, non piu importati dalla UI.
- `/api/generate` non chiama piu `generateWithHiggsfield` nel percorso vivo.
- Nessuna cancellazione: scelta reversibile.

### 5. Copia
- Controllare `app/` per menzioni utente di Higgsfield / Soul / HUMAN / SHAPE e
  aggiornarle se fuorvianti.
- La riga prezzi "motore fotoreale" resta valida (ECHO e il motore fotoreale).

## Fuori scope
- Cancellare il backend Higgsfield (`lib/higgsfield.ts`, `lib/soul-models.ts`).
- Toccare i prezzi ECHO o il modello "compute a parte".
- Lo storico dei contenuti gia generati (mantiene la sua etichetta tier).
- Generazione multi-persona (non esiste).

## Verifica (dev server gia attivo su :3000)
- `npm run build` + `npx tsc` verdi.
- `/match`: nessun toggle motore, nessun HUMAN/SHAPE, nessuno stile Soul; solo controlli ECHO.
- Una generazione ECHO end-to-end funziona ancora.
- Badge "ECHO" su catalogo e passaporto (verifica a runtime via preview).
- Console pulita.
