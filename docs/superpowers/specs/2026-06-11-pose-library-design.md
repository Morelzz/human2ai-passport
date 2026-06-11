# Libreria pose (manichini) per ECHO — Design

> Data: 2026-06-11 · Approvato da Morelz in chat (approccio A: libreria su Storage, zero migrazioni).
> Commit del doc insieme al modulo (regola: un modulo = una sessione + un commit).

## Cosa

Il compratore, nella generazione ECHO, può scegliere una **posa** da una libreria curata di
**manichini pre-generati** (figure neutre senza volto). La posa occupa uno dei 2 slot
"Capi e scenari" esistenti: un box per l'outfit, uno per la posa. ECHO genera l'avatar
con quell'outfit, in quella posa.

**Principi rispettati:** nessuna foto di terzi caricata (solo libreria nostra — coerente
con D4), gate del consenso INTOCCATO (la posa entra a valle, come ogni reference),
limite gpt-image-2 di 10 immagini rispettato da solo (8 identità + outfit + posa = 10).

## Decisioni prese con Morelz

1. **Fonte posa: SOLO libreria nostra.** Niente upload libero (estendibile in futuro).
2. **Scope: tutte le generazioni ECHO**, non solo categoria Fashion.
3. **Produzione: le genera Claude con ECHO** (text-to-image, ~10-12 pose, <€1 totale);
   Morelz approva ogni posa prima che entri in libreria.

## Architettura (approccio A — Storage-driven)

### 1. Set manichini
- gpt-image-2 text-to-image, verticale 1024×1536, qualità media.
- Soggetto UNICO per coerenza visiva: manichino da sartoria grigio neutro, senza volto,
  fondo bianco pieno.
- Set di partenza (~12): in piedi frontale, tre quarti, camminata, braccia conserte,
  mani in tasca, seduta su sgabello, appoggio al muro, profilo, mano al mento,
  gamba incrociata in piedi, seduta a terra, braccia aperte.
- Flusso: genero in locale → Morelz approva → solo le approvate vanno in libreria.

### 2. Libreria su Storage
- PNG su bucket pubblico `assets/poses/<slug>.png` (slug parlante, es. `standing-arms-crossed.png`).
- Nuova rotta `GET /api/poses`: lista la cartella via service role, ritorna
  `[{id, label, url}]` (label italiana via mappa minima dallo slug), cache 5 minuti,
  difensiva se la cartella è vuota/assente.
- Aggiungere una posa = caricare un file. Zero codice, zero migrazioni.

### 3. UI (MatchClient)
- Nel box "Capi e scenari" (solo motore ECHO, com'è oggi): nuova azione
  "Posa dalla libreria" → griglia di miniature → la posa selezionata occupa uno
  dei 2 slot come mini-card (thumbnail + "Posa · <label>" + rimuovi).
- UNA sola posa per generazione. Il client invia solo `poseId` (niente byte).

### 4. Server (entrambi i percorsi: sync e worker async)
- `/api/generate` e `lib/echo-job.ts`: se arriva `poseId`, validarlo contro
  `assets/poses/` (esiste → scarica e accoda alle reference; non esiste → errore
  pulito PRIMA di chiamare OpenAI, zero costi).
- Nuovo ruolo `posa` nelle note semantiche (in TUTTI E DUE i file, oggi duplicati):
  "the person adopts the exact body pose shown in the mannequin reference image —
  ignore the mannequin's appearance, material and setting, it only defines the body pose".
- Gate consenso, watermark invisibile, royalty, certificato: INVARIATI.

## Fuori scope (esplicito)

- Upload libero di pose da parte del compratore.
- Pose per Higgsfield (solo ECHO: gli extra-slot sono già ECHO-only).
- Pannello admin per la libreria (si gestisce via storage/script).
- Tabella DB / migrazioni: nessuna.

## Done quando

a. `/api/poses` ritorna la libreria dallo storage.
b. UI: scelgo posa + outfit → genero → avatar in quella posa, con quell'outfit,
   identità intatta (E2E con Random, 1-2 generazioni reali ~€0,26 l'una).
c. Generazione SENZA posa = flusso identico a oggi (regressione zero).
d. `poseId` inesistente → errore pulito, OpenAI mai chiamato.
