# Ward, Trovati: anteprima immagine + link cliccabili + lookalike AI

Data: 2026-06-25. Stato: approvato (Morelz). Stile: riusare il design system Ward
esistente (`app/ward/ward.css`, font `--font-ward-display`/`--font-ward-mono`,
palette Ward), nessuno stile nuovo.

## Problema

Nei "Trovati" (Detections) l'area in alto mostra un segnaposto (`.glyph`, il
"cerchio blu"), non l'immagine trovata, e l'URL non e' cliccabile. Serve:
1. anteprima dell'immagine reale + link cliccabili (immagine e pagina);
2. catturare anche i lookalike AI simili ma non identici.

Vincolo privacy (A2.3, mandato caveau): lo scan cancella SEMPRE i byte del
candidato, non si salva nessuna immagine di terzi.

## Decisioni

- Anteprima: **dal vivo via proxy interno** (transitoria, niente salvato).
- Link: **immagine + pagina** (catturare `pagesWithMatchingImages`).
- Lookalike AI: **aggressivo** = aggiungere `visuallySimilarImages` alla scoperta
  e allargare la banda "Da rivedere".

## Architettura

### 1. Dato: pagina ospitante
- `scan_matches`: nuova colonna `page_url text` nullable (migrazione, su "applica").
- `Candidate` (discovery/types): aggiunge `pageUrl?: string`.
- `ScanMatchRow` + `insertMatch` (scan.ts, scan-repo.ts): aggiungono `pageUrl`.
- `load-server.ts` seleziona `page_url`; `load.ts` mappa `pageUrl` su `WardDetection`.

### 2. Discovery (google-vision.ts)
- Estrarre il parsing in funzione PURA `parseWebDetection(webDetection, limit)`:
  - candidati da `fullMatchingImages` + `partialMatchingImages` + `visuallySimilarImages`;
  - mappa immagine->pagina da `pagesWithMatchingImages[].{pageUrl, full/partialMatchingImages}`;
  - `visuallySimilarImages` senza pagina -> `pageUrl` null;
  - dedup per url, taglio a `limit`.
- Il provider chiama la funzione pura (testabile senza rete).

### 3. Anteprima: proxy privacy/SSRF-safe
- Nuovo `GET /api/ward/preview/[matchId]` (runtime nodejs):
  - auth obbligatoria; verifica che il match appartenga a un avatar dell'utente
    (ownership via owner_id), altrimenti 404/403;
  - `sensitivity = minor` -> 403 (mai servita);
  - guard SSRF puro `isSafeRemoteImageUrl(url)`: solo http/https, no IP privati/
    loopback/link-local, no host non risolvibili a pubblico (best-effort su hostname);
  - fetch al volo: solo `content-type image/*`, tetto dimensione, timeout; stream
    dei byte indietro con il content-type; `Cache-Control` breve; NIENTE salvato.

### 4. UI (Detections.tsx, DetectionDetail.tsx, ward.css)
- Card e dettaglio: al posto di `.glyph`, `<img>` puntato al proxy quando c'e'
  un match id reale. `sensitive` -> sfocata (riusa `.blurred`), reveal a scelta;
  `minor` -> resta lucchetto, nessuna `<img>`. `onError` -> fallback al `.glyph`.
- Dettaglio "Sorgente": URL immagine e pagina come `<a target="_blank"
  rel="noopener noreferrer nofollow">`.
- Stile: nuove regole in `ward.css` coi token esistenti; mobile = desktop
  (ward-frame e' colonna centrata).

### 5. Lookalike AI
- Scoperta: `visuallySimilarImages` (vedi sopra).
- Match: alzare default `reviewMaxDist` 0.6 -> 0.68 (confirmed resta 0.5),
  gia' sovrascrivibile via `WARD_MATCH_REVIEW_DIST`.

## Test
- `parseWebDetection`: full/partial/visuallySimilar, mappa pagina, dedup, limit.
- `isSafeRemoteImageUrl`: blocca localhost/IP privati/schemi non http; passa URL pubblici.
- score bands: nuovo default + caso al confine allargato.
- scan `insertMatch` include `page_url` (repo fake).

## Limite noto (onesto)
Becchiamo copie/edit + visivamente simili + deepfake somiglianti. Un volto AI del
tutto inventato e mai indicizzato resta fuori (servirebbero motori ricerca-volti,
esclusi per privacy A2.4). Fuori scope: classificatore "e' AI" (campo `ai_verdict`
gia' in tabella, non popolato; hook futuro).

## Sicurezza/privacy
Proxy owner-scoped + minor-bloccato + SSRF-guard + transitorio (niente storage):
coerente con A2.3 e mandato caveau. L'IP utente non raggiunge il sito terzo.
