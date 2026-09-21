# Ward: match biometrico solo sui frontali (calcolo allo scan) — Design

Data: 2026-06-25
Stato: approvato (brainstorming), in implementazione TDD.

## Problema (verificato a terra)

Test reale su un reference set a 3 angoli (Luca Agnelli): lo scan Ward riportava
come "match" PERSONE DIVERSE. Causa misurata:
- I descrittori di PROFILO sono poco discriminanti (FaceNet 128-d non rappresenta
  le facce di lato): il volto stesso, frontale vs profilo, era a 0.62-0.71.
- `match` usa `bestDistance` = distanza MINIMA su tutte le reference. Un profilo
  rumoroso sta a 0.53-0.60 da estranei: basta lui per fabbricare un falso match.
- Evidenza: su 7 falsi positivi residui (dopo aver stretto la banda a 0.6),
  reference vincente dx=4, sx=3, **frontale=0**. Tutti via profilo.

Fix A (gia' fatto): banda review 0.68 -> 0.6. Mitiga, non cura.
Fix B (questo doc): il gate biometrico usa SOLO i descrittori FRONTALI. I profili
restano utili alla DISCOVERY (allargano i candidati), ma non votano nel match.

## Decisione presa

Calcolo allo SCAN, niente persistenza/reindex/schema. Lo scan gia' scarica le
immagini reference (`referenceImageBytesList`, per la query discovery): le
ri-embedda server-side, calcola descrittore + frontalita' per ognuna, e usa come
riferimenti del match SOLO le frontali.

## Pezzi

### 1. `lib/ward/matching/frontality.ts` (nuovo, puro)
`frontalityFromLandmarks(points) -> [0,1]` (1 = frontale). Proxy di yaw: posizione
orizzontale del naso (landmark 30) tra gli estremi mascella (0 e 16). Centrato =
frontale, su un estremo = profilo. Landmark incompleti (<68) o span degenere -> 0
(fail-safe: nel dubbio NON frontale). Soglia tarabile via env `WARD_FRONTAL_MIN`.

### 2. `lib/ward/matching/embed.ts`
`EmbedResult` guadagna `frontality: number | null` (dai landmark gia' rilevati nel
pass di detection, costo ~0; null se nessun volto). I candidati la ignorano;
nessun altro chiamante cambia.

### 3. `lib/ward/scan.ts` `runScan`
- Nuova dep iniettabile `embedRef?: (bytes) => Promise<{descriptor, frontality, faceCount}>`
  (default = embedder reale), per test hermetici.
- Se `referenceImageBytesList` presente: embedda ognuna, tiene i descrittori con
  `frontality >= WARD_FRONTAL_MIN` come `refs`. Il match gira solo su quelli.
- **Nessuna reference frontale** (solo profili / volti illeggibili): fail-safe, lo
  scan chiude `done` con 0 match e `reportDegradation("ward.no_frontal_reference")`.
  Meglio niente che falsi positivi; l'operatore aggiunge una frontale.
- **Nessuna immagine reference** (solo portrait, es. seed): fallback ai descrittori
  dell'indice (`repo.loadReferenceDescriptors`) come oggi, con nota di degrado
  (`ward.frontal_from_index_unfiltered`): non posso calcolare la frontalita'.
- La DISCOVERY non cambia (i profili restano nelle query, allargano i candidati).

## Soglia (calibrazione)
Prima di fissare `WARD_FRONTAL_MIN`, il diagnostico Luca stampa la frontalita' di
front/dx/sx. Atteso: frontale alta, profili bassi. La soglia si pone in mezzo con
margine. Default proposto da rivedere coi numeri: ~0.5.

## Costo
+N embed reference per scansione (~10-15s per 8 foto), dentro il budget 60s del
worker, loggato. Se pesa, promozione futura a "frontalita' persistita nell'indice"
senza toccare il gate.

## Test (TDD)
- `frontality.test.ts`: frontale (naso centrato) -> alto; profilo (naso su un
  estremo) -> basso; landmark incompleti -> 0; span degenere -> 0.
- `scan.test.ts`: il match riceve SOLO i descrittori frontali (spia su match);
  un candidato vicino solo a un ref non-frontale -> non matchato; zero frontali ->
  skip + degrado; nessuna immagine -> fallback all'indice.
- Diagnostico Luca rieseguito: falsi positivi attesi -> ~0.

## Non in scope
- Modello pose-robust (ArcFace, opzione C) e face-search di terzi (opzione D).
- Persistenza della frontalita' nell'indice (promozione futura).
- Cambi al gate KYC (ha soglie e shape propri, non toccato).
