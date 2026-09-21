# SEMBLIC Studio: macchina, ottica e editing (spec)

Estensione del sistema di generazione esistente. Due aggiunte:

1. **Macchina e ottica** scelte prima di generare (modificatori di prompt).
2. **Editing in stile** dopo la generazione (post produzione non distruttiva, 12 stili).

Si innesta sul flusso reale: `app/api/generate/route.ts` (funzione `buildEchoPrompt`), motore ECHO
(`lib/engines/echo.ts`, gpt-image-2) e `sharp` (gia in dipendenze). Anteprima viva:
`design/anteprima_studio_generazione.html`. Data: 2026-06-18.

Principio: nessun nuovo motore. La macchina e l'ottica diventano testo nel prompt (come la posa).
L'editing e una passata su `sharp` sull'immagine gia generata.

---

## Parte 1: Macchina e ottica (modificatori di prompt)

### Come si innesta

Il client manda due nuovi campi a `/api/generate`: `camera` e `lens` (stringhe enum).
Lato server, come per la posa, si traducono in token inglesi da una **whitelist nostra** (mai testo
libero del client) e si appendono dentro `buildEchoPrompt`, dopo la posa e prima della direzione
libera. Esempio di frase risultante:

`"... The person's body pose: ... . Photographed with full-frame digital, sharp, wide dynamic range, 85mm portrait lens, creamy bokeh, shallow depth of field. Additional direction: <scena>."`

### Enum macchina, token

| valore (client) | token nel prompt |
|---|---|
| analogica | shot on 35mm film, natural grain, warm tones |
| full_frame | full-frame digital camera, sharp, wide dynamic range |
| medio_formato | medium format camera, extreme detail, smooth bokeh |
| polaroid | instant Polaroid photo, white frame, vintage tones |

### Enum ottica, token

| valore (client) | token nel prompt |
|---|---|
| 8mm | 8mm fisheye, ultra wide-angle, strong distortion |
| 12mm | 12mm ultra wide-angle |
| 20mm | 20mm wide-angle, environmental |
| 35mm | 35mm lens, reportage perspective |
| 50mm | 50mm lens, natural perspective |
| 85mm | 85mm portrait lens, creamy bokeh, shallow depth of field |
| 200mm | 200mm telephoto, compressed perspective |

### Note di onesta

L'ottica e **simulata**: il modello imita il look (campo visivo, compressione, profondita di campo),
non e una resa ottica fisica. Va comunicato nella UI con una riga discreta.

### Validazione (server)

`camera` e `lens` accettati solo se presenti nella whitelist sopra, altrimenti si ignorano (nessun
errore bloccante). Mai concatenare testo libero del client come parametro fotografico.

---

## Parte 2: Editing in stile (post produzione non distruttiva)

### Come si innesta

L'immagine si genera **pulita**. Lo stile e una passata di color grading applicata dopo, con `sharp`.
Non distruttiva: si salvano i parametri del look, l'immagine pulita resta intatta, il grade si applica
in fase di rendering anteprima e al download.

- **Anteprima**: dal vivo nel client con filtri CSS (vedi il file di anteprima). Istantanea, reversibile.
- **Finale**: al download o per la versione commerciale, si applica con `sharp` lato server sull'immagine
  pulita, poi si imprime la filigrana come gia avviene.

### Parametri del look (fonte di verita)

Ogni stile e definito da sette parametri (gli stessi del file di anteprima), con una **intensita** 0..1
che li scala (k):

`sat` (saturazione), `con` (contrasto), `bri` (luminosita), `sep` (seppia 0..1), `gray` (bianco e nero 0..1),
`hue` (rotazione tinta in gradi), `grain` (grana on/off).

Interpolazione con l'intensita k: i valori moltiplicativi (sat, con, bri) si interpolano da 1
(`val' = 1 + k*(val-1)`), quelli additivi (sep, gray, hue, grana) si scalano (`val' = k*val`).

### I 12 stili

| stile | sat | con | bri | sep | gray | hue | grana |
|---|---|---|---|---|---|---|---|
| Naturale | 1.00 | 1.00 | 1.00 | 0 | 0 | 0 | no |
| Pastello | 0.80 | 0.92 | 1.08 | 0.12 | 0 | 0 | no |
| Contrasto forte | 1.12 | 1.40 | 0.98 | 0 | 0 | 0 | no |
| Bianco e nero | 1.00 | 1.15 | 1.00 | 0 | 1 | 0 | no |
| Cinematico | 1.05 | 1.18 | 1.00 | 0.18 | 0 | -8 | si |
| Vintage sbiadito | 0.82 | 0.90 | 1.06 | 0.28 | 0 | 0 | si |
| Caldo dorato | 1.20 | 1.05 | 1.04 | 0.25 | 0 | -12 | no |
| Freddo notte | 1.10 | 1.08 | 0.96 | 0 | 0 | 200 | no |
| Seppia | 0.90 | 1.00 | 1.00 | 0.85 | 0 | 0 | no |
| Matte opaco | 0.90 | 0.88 | 1.05 | 0 | 0 | 0 | no |
| HDR punch | 1.50 | 1.22 | 1.02 | 0 | 0 | 0 | no |
| Cross process | 1.30 | 1.12 | 1.00 | 0 | 0 | 30 | no |

### Traduzione su sharp (lato server, finale)

- saturazione, luminosita, tinta: `sharp().modulate({ saturation: sat, brightness: bri, hue: hue })`.
- contrasto: `sharp().linear(con, 128*(1-con))` (pivot a meta scala).
- bianco e nero: `sharp().grayscale()` quando gray = 1.
- seppia: matrice di ricombinazione tonale calda (`recomb`) oppure `tint` warm proporzionale a sep.
- grana: composita un PNG di rumore (overlay) con opacita proporzionale a k.

I filtri CSS del file di anteprima sono il riferimento visivo: `sharp` riproduce lo stesso look.

---

## Campi API aggiunti a /api/generate

- `camera`: enum macchina (vedi tabella). Opzionale.
- `lens`: enum ottica (vedi tabella). Opzionale.
- `grade`: id stile (es. cinematico). Opzionale, default naturale.
- `gradeIntensity`: numero 0..1, default 0.85.
- `grain`: booleano, default secondo lo stile.

Camera e lens influenzano il **prompt** (prima della generazione). Grade, intensita e grana
influenzano il **rendering** (dopo). I primi cambiano l'immagine generata, i secondi no, quindi
cambiare stile o intensita non richiede una nuova generazione ne un nuovo costo.

## Modello dati (additivo, tabella generations)

Aggiungere colonne (migrazione additiva, nessun dato biometrico):

| colonna | tipo | note |
|---|---|---|
| camera | text \| null | enum macchina |
| lens | text \| null | enum ottica |
| grade | text \| null | id stile editing |
| grade_intensity | numeric \| null | 0..1 |
| grain | bool \| null | grana attiva |

## Criterio di "fatto" (MVP)

- [ ] In generazione scelgo macchina e ottica, e li vedo comparire nel prompt finale.
- [ ] Genero e ottengo un'immagine coerente con la scelta fotografica.
- [ ] Applico uno dei 12 stili e l'anteprima cambia dal vivo, senza rigenerare.
- [ ] Regolo l'intensita e attivo la grana.
- [ ] Al download la versione finale ha il grade applicato con sharp, piu la filigrana.

## Fuori scope (MVP)

- LUT caricabili dall'utente (fase 2).
- Editing locale per zone, maschere, pennelli (fase 3).
- Ottica reale simulata fisicamente (resta un'imitazione del look).

## Guardrail (invariati)

Chiavi AI e Supabase solo lato server. Whitelist server per camera, lens e grade (mai testo libero come
parametro). Identity-lock, consenso per categoria, royalty e certificato restano come nel flusso attuale.
Mai trattini lunghi nei testi pubblici.
