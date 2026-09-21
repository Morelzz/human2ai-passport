# Ward Discovery dai 3 angoli (union round-robin) — Design

Data: 2026-06-25
Stato: approvato (brainstorming), pronto per il piano.

## Problema

Oggi `runScan` (Job B, `lib/ward/scan.ts`) interroga la discovery con UNA sola
foto reference (la prima, scelta in `app/api/ward/scan/route.ts` via
`downloadFirstImage`). Una sola angolazione trova poco: un frontale non scopre le
foto di profilo della stessa persona, e viceversa. L'avatar protetto ha piu foto
reference (le 3 angolazioni di cattura). Vogliamo interrogare la discovery con
TUTTE e unire i candidati, allargando la rete senza alzare il costo.

Questo NON e' face-search di terzi (decisione aperta #1, separata). Resta
similarita' di CONTENUTO via Google Vision WEB_DETECTION, rispettando A2.4.

## Decisioni prese

1. **Budget candidati: unico ~12 (DEFAULT_LIMIT), round-robin tra gli angoli.**
   Il costo pesante e' l'embed+match face-api per candidato, sotto il cap
   serverless 60s. Manteniamo lo stesso budget di oggi: interroghiamo i 3 angoli,
   uniamo+deduplichiamo, poi tagliamo l'unione a `limit` prendendo a turno da ogni
   angolo (cosi' ogni angolo contribuisce, niente angolo che monopolizza).

2. **Fallimento parziale = degrado, non abort.** Un angolo il cui `find` lancia
   viene saltato con `reportDegradation("ward.discovery_angle_failed")` e lo scan
   prosegue sugli altri. Si fallisce lo scan (come oggi, stato `error`, reason
   `discovery_failed`) SOLO se OGNI angolo fallisce. La completezza della discovery
   non e' un gate di sicurezza (il consenso A2.1 e la data-minimization A2.3 lo
   sono, e restano intatti): un risultato parziale e' degradato, non un buco.

3. **TUTTI gli angoli, in PARALLELO** (aggiornato dopo verifica a terra: i founder
   hanno 6-8 foto reference, non 3). Si interroga Vision con OGNI reference, ma le
   chiamate partono in concorrenza (`Promise.allSettled`, l'ordine e' preservato ->
   round-robin deterministico): latenza ~3s invece di ~24s sequenziali, sotto il
   cap 60s. Vision e' economico (~0.35 cent/chiamata) e il costo pesante
   (embed+match) resta fisso al cap ~12 dell'unione: scala solo Vision.

## Modifiche (3 punti, seam pulito)

### 1. `lib/ward/scan.ts`
- `ScanDeps.referenceImageBytes: Uint8Array` (singolo) -> `referenceImageBytesList: Uint8Array[]`.
- In `runScan`, dopo gate + reference descriptors:
  - Costruisco le query: se `referenceImageBytesList` non vuota -> una query
    `{ imageBytes }` per ciascuna immagine; altrimenti se `referenceImageUrl` ->
    singola `{ imageUrl }` (fallback portrait, come oggi); altrimenti singola `{}`.
  - Chiamo `provider.find(query, limit)` per OGNI angolo in PARALLELO
    (`Promise.allSettled`, ordine preservato). Esito `rejected` -> `degrade` +
    lista vuota per quell'angolo.
  - Se TUTTI gli angoli hanno lanciato -> `finishJob(error)` + `scan.error`
    (reason `discovery_failed`), come il comportamento attuale a chiamata singola.
  - **Union round-robin:** scorro gli indici 0..max, per ogni indice prendo il
    candidato i-esimo di ogni lista-angolo (se esiste), dedup per `url` con un
    `Set`, mi fermo quando l'unione raggiunge `limit`.
- Il resto della pipeline (insert candidate -> fetch -> embed+match -> match o
  cancella, con `deleteCandidate` SEMPRE nel `finally`) NON cambia. Su match si
  salva solo `url` + `host` + `pageUrl` + `phash`. Data-minimization A2.3 intatta.

### 2. `app/api/ward/scan/route.ts`
- `downloadFirstImage("references", handle)` -> `downloadAll("references", handle)`
  (gia' esistente, `lib/storage.ts:73`, ritorna `Buffer[]` ordinati per nome).
- Mappo i `Buffer[]` in `Uint8Array[]` -> `referenceImageBytesList`.
- Se la lista e' vuota -> fallback `referenceImageUrl = portrait_url`, come oggi.

### 3. Provider invariato
`DiscoveryProvider.find` resta single-image: il fan-out vive solo in `runScan`.
Costo Vision: 6-8 chiamate WEB_DETECTION in PARALLELO (rapide/economiche) invece
di 1; il costo face-api resta limitato dal cap a ~12 candidati dell'unione.

## Back-compat / casi limite
- 1 sola reference (demo/seed) -> lista a 1 elemento -> identico a oggi.
- Nessuna reference -> portrait URL fallback -> identico a oggi.
- Zero candidati totali -> `done` con 0 match, come oggi.

## Privacy
Invariata. I bytes reference sono gia' in memoria nella route; passiamo un array
invece di un buffer. Nessuna nuova persistenza, nessun volto terzo trattenuto.
I candidati restano transitori e cancellati sempre.

## Test (TDD, `lib/ward/scan.test.ts`)
- Multi-angolo: 3 liste-angolo distinte -> unione deduplicata (un `url` ripetuto
  tra due angoli compare 1 volta sola).
- Round-robin rispetta il cap `limit` e pesca a turno (ogni angolo contribuisce).
- Un angolo che lancia -> lo scan prosegue sugli altri (degrado, non abort).
- Tutti gli angoli falliti -> stato `error`, reason `discovery_failed`.
- Aggiorno i 2 test "immagine-query" esistenti alla nuova forma
  (`referenceImageBytesList: [bytes]`).

## Non in scope
- Face-search di terzi (FaceCheck/Lenso) = decisione aperta #1.
- Cambi al matching engine, al gate, alla sensibilita', allo storage schema.
