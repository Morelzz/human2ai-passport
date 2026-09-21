# SEMBLIC: Build spec per Claude Code (Studio di generazione + Editor di post produzione)

Obiettivo: ricreare nel prodotto, in modo identico, lo studio di generazione e l'editor di post
produzione che abbiamo prototipato. Questo documento e mirato a Claude Code. Data: 2026-06-18.

## 0. Come usare questo documento

I prototipi HTML in `design/` sono la FONTE DI VERITA per layout, componenti, stati e interazioni.
Aprili nel browser e replica esattamente aspetto e comportamento. Valgono piu di qualsiasi screenshot,
perche sono vivi e interattivi.

- `design/anteprima_match_mobile.html` : studio di generazione, mobile-first. VERSIONE CANONICA.
- `design/anteprima_match_studio_redesign.html` : stesso studio, vista desktop a due colonne.
- `design/anteprima_editor_mobile.html` : editor di post produzione, mobile. VERSIONE CANONICA.
- `design/anteprima_editor_postproduzione.html` : editor, vista desktop.
- Spec di supporto gia scritta: `docs/STUDIO_GEN_CAMERA_EDITING_SPEC.md` (mappatura macchina/ottica/editing).

Regola: dove questo documento e i file design divergono, vince il file design per la UI, e questo
documento per l'integrazione col backend.

## 1. Cosa stiamo costruendo

Il restyling del flusso di generazione esistente (`/match`) e una nuova finestra di editing che
compare DOPO la generazione. Il motore resta ECHO (gpt-image-2, `lib/engines/echo.ts`), invisibile
e lato server. Identita bloccata dalle foto consensuali dell'avatar (identity-lock). Niente cambia
su consenso, royalty, certificato e VOLT: si riusa tutto il backend attuale.

## 2. Vincoli tecnici (non negoziabili)

- Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase. Niente over-engineering.
- Mobile-first: il telefono e il riferimento primario. Il desktop e un adattamento a due colonne.
- Chiavi e segreti (OpenAI per ECHO, Anthropic per l'enhancer, Supabase) SOLO lato server.
- Palette SEMBLIC (da `app/globals.css` e `lib/ui.ts`): Obsidian `#0C0F17`, superfici `#141A24` e
  `#1E2530`, linee `#2C3440`, testo Lumen `#F2E9D8` (a opacita, mai grigi), Amber `#F2A93B`
  (testo su amber `#412402`), salvia `#7FAE96`, coral `#EE7A70`. Bottoni Amber pieni, mai gradienti.
- Testi pubblici: MAI trattini lunghi, usare virgole, due punti o parentesi.
- Editing NON distruttivo: l'immagine generata pulita resta intatta, le modifiche sono parametri.

## 3. PARTE A: Studio di generazione (`/match`, redesign)

### 3.1 Flusso

1. Avvio per obiettivo (schermata iniziale): l'utente sceglie cosa creare, si preimpostano i parametri.
2. Composizione: avatar gia scelto, scena, posa, inquadratura, espressione, stile colore, look
   fotografico (macchina, ottica, luce), immagini di riferimento, formato. Anteprima del "prompt finale".
3. Genera (ECHO). Stato di lavorazione (puo durare 1-3 minuti, async come gia oggi).
4. A risultato pronto si apre l'Editor di post produzione (Parte B).

### 3.2 Avvio per obiettivo

Schermata iniziale con riquadri. Selezionando un obiettivo si preimpostano formato, inquadratura,
luce, stile colore e ottica, poi si entra nella composizione. C'e anche "Scena libera" che salta.

| Obiettivo | Formato | Inquadratura | Luce | Stile colore | Ottica |
|---|---|---|---|---|---|
| Post Instagram | Verticale | Mezzo busto | Naturale | Naturale | 50mm |
| Foto prodotto | Quadrato | Figura intera | Studio | Naturale | 50mm |
| Ritratto LinkedIn | Verticale | Primo piano | Studio | Naturale | 85mm |
| Banner ADV | Orizzontale | Figura intera | Golden hour | Cinematico | 35mm |
| Scena libera | nessun preset | | | | |

### 3.3 Avatar hero

In alto una card grande col volto dell'avatar selezionato (vedi design): ritratto, alias, tier
(badge salvia), stato consenso per la categoria, e "Cambia volto". Sotto, tutti i controlli.

### 3.4 Prompt (scena) + enhancer

Campo scena libera. Pulsante "Migliora prompt" che chiama l'endpoint esistente
`app/api/enhance-prompt/route.ts` (Claude Haiku, ritorna `{enhanced}`). La proposta appare
evidenziata con "Usa questa" / "Tieni la mia". Comportamento identico all'attuale.

### 3.5 Posa (sotto il prompt)

Le pose NON stanno piu dentro gli slot immagini. Sono un campo che apre un pannello a comparsa
(bottom sheet su mobile) con le pose raggruppate per categoria, icone grandi, piu "Nessuna" e
"Casuale". Sorgente pose: `lib/poses.ts` (libreria su storage, `POSE_PROMPTS`). Al motore va il
testo della posa (gia gestito da `fetchPosePrompt` e `poseId`).

Categorie e voci (token inglese per il prompt):

| Categoria | Voce | Token |
|---|---|---|
| Base | Nessuna | (vuoto) |
| Base | Casuale | dynamic natural pose |
| In piedi | In piedi | standing straight facing the camera |
| In piedi | Tre quarti | three-quarter turn |
| In piedi | Mani in tasca | hands in trouser pockets |
| In piedi | Mani sui fianchi | hands on hips, power pose |
| In piedi | Braccia conserte | arms crossed over the chest |
| In piedi | Mano al mento | hand on the chin, thoughtful |
| In piedi | Al muro | leaning against a wall |
| In piedi | Profilo | full side profile |
| In piedi | Braccia aperte | arms open wide |
| Seduta | Su sgabello | sitting on a tall stool |
| Seduta | A terra | sitting on the floor, knee up |
| Dinamica | Camminata | captured mid-stride walking |
| Editoriale | Di spalle | seen from behind, looking over the shoulder |
| Editoriale | Prodotto in mano | presenting a product held in one hand |

### 3.6 Inquadratura (picker a icone)

Campo che apre un pannello con 4 icone (crop su figura). Selezione singola.

| Voce | Token | Default |
|---|---|---|
| Primo piano | close-up portrait, head and shoulders | |
| Mezzo busto | medium shot, waist up | si |
| Figura intera | full-body shot | |
| Piano americano | American shot, from the knees up | |

### 3.7 Espressione (picker a volti)

Campo che apre un pannello con 5 icone volto.

| Voce | Token |
|---|---|
| Naturale | (vuoto) |
| Sorriso | natural smile |
| Serio | serious expression |
| Pensieroso | thoughtful expression |
| Risata | candid laughter |

### 3.8 Stile colore (in generazione)

Riga di chip con pallino colore. E un modificatore del prompt (decide il look in fase di
generazione), distinto dall'editor post (che rifinisce dopo).

| Voce | Token |
|---|---|
| Naturale | (vuoto) |
| Bianco e nero | black and white photography |
| Colori pastello | soft pastel color palette |
| Cinematico | cinematic teal and orange color grading |
| Contrasto forte | high contrast, deep shadows |
| Effetto flash | direct on-camera flash, harsh flash look |

### 3.9 Look fotografico: macchina, ottica, luce

Macchina (4):

| Voce | Token |
|---|---|
| Analogica | shot on 35mm film, natural grain, warm tones |
| Full frame | full-frame digital, sharp, wide dynamic range |
| Medio formato | medium format, extreme detail, smooth bokeh |
| Polaroid | instant Polaroid photo, white frame, vintage tones |

Ottica (7), etichette con i mm:

| Voce | Token |
|---|---|
| 8mm | 8mm fisheye, ultra wide-angle |
| 12mm | 12mm ultra wide-angle |
| 20mm | 20mm wide-angle |
| 35mm | 35mm reportage perspective |
| 50mm | 50mm natural perspective |
| 85mm | 85mm portrait lens, creamy bokeh, shallow depth of field |
| 200mm | 200mm telephoto, compressed perspective |

Luce (5):

| Voce | Token |
|---|---|
| Naturale | natural light |
| Golden hour | golden hour warm light |
| Studio | studio softbox lighting |
| Controluce | backlight, rim light |
| Neon | nighttime neon lighting |

Le righe orizzontali (ottica, luce, stile colore) hanno una sfumatura a destra che segnala lo scroll.

### 3.10 Immagini di riferimento (max 2)

Come nel sistema attuale (`extraRefs` in `/api/generate`): due slot, ognuno con immagine + ruolo
(Outfit/capo, Accessorio, Sfondo/scenario, Oggetto) + una stringa d'uso (es. "tiene la bottiglia
con la mano destra"). Vincolo gia presente: un solo outfit per generazione (se uno slot e Outfit,
l'altro non offre Outfit). La posa occupa concettualmente uno slot via `poseId` (gia cosi oggi).
La descrizione d'uso entra come clausola nel prompt (vedi `clauseForExtra` in `/api/generate`).

### 3.11 Motore e formato

Motore: solo ECHO (mostrato come stato fisso "ECHO fotoreale", non un toggle). Formato: Quadrato,
Verticale, Orizzontale. Risoluzione: HD, 2K, 4K (mappa su `ECHO_SIZE_GRID` in `MatchClient.tsx` /
`lib/engines/echo.ts`). Qualita: come oggi.

### 3.12 Prompt finale: composizione e dove si aggiunge

Il "prompt finale" mostrato all'utente e indicativo. La composizione VERA avviene lato server in
`buildEchoPrompt` (`app/api/generate/route.ts`). Estendere quella funzione: dopo posa ed extra,
aggiungere un segmento fotografico costruito SOLO da whitelist server (mai testo libero del client):

`Photographed as: <stile colore>, <inquadratura>, <espressione>, <macchina>, <ottica>, <luce>.`

Ordine di concatenazione dei token (come nell'anteprima): scena, posa, inquadratura, espressione,
stile colore, luce, macchina, ottica, poi le clausole delle immagini di riferimento. I valori
arrivano dal client come chiavi enum e si traducono nei token inglesi della whitelist server.

### 3.13 Genera

Bottone Amber pieno con il costo dentro (VOLT, come oggi, `voltStr('gen.cta')`). Stato di
lavorazione e flusso async invariati. A risultato pronto, apri l'Editor (Parte B).

### 3.14 Campi nuovi per `/api/generate`

Aggiungere al body, tutti opzionali e validati su whitelist server (ignorati se non validi):
`camera`, `lens`, `light`, `colorStyle`, `framing`, `expression`. Non toccano consenso ne categoria.

## 4. PARTE B: Editor di post produzione

### 4.1 Principio

Compare DOPO la generazione, a tutto schermo. Non distruttivo: l'immagine pulita resta, le modifiche
sono parametri salvati. Anteprima live lato client (CSS/canvas/WebGL per immediatezza), resa finale
"cotta" lato server al download/upscale (vedi 4.12).

### 4.2 Layout

- Mobile (`design/anteprima_editor_mobile.html`, canonico): immagine FISSA in alto, sempre visibile;
  sotto i parametri in menu a tendina (accordion) che si aprono uno alla volta; barra Esporta in fondo.
- Desktop (`design/anteprima_editor_postproduzione.html`): immagine a sinistra (sticky), pannello
  parametri a destra che scorre.

In alto sull'immagine: "Tieni premuto: originale" per il confronto. NIENTE pulsante upscale
sull'immagine: l'upscale sta SOLO in Esporta.

### 4.3 Preset (look) + intensita

12 preset, ognuno definito da 7 parametri base. Cursore Intensita 0..100 (default 85) che li scala.

| Preset | sat | con | bri | sep | gray | hue | grana |
|---|---|---|---|---|---|---|---|
| Naturale | 1.00 | 1.00 | 1.00 | 0 | 0 | 0 | no |
| Pastello | 0.80 | 0.92 | 1.08 | 0.12 | 0 | 0 | no |
| Contrasto | 1.12 | 1.40 | 0.98 | 0 | 0 | 0 | no |
| Bianco e nero | 1.00 | 1.15 | 1.00 | 0 | 1 | 0 | no |
| Cinema | 1.05 | 1.18 | 1.00 | 0.18 | 0 | -8 | si |
| Vintage | 0.82 | 0.90 | 1.06 | 0.28 | 0 | 0 | si |
| Dorato | 1.20 | 1.05 | 1.04 | 0.25 | 0 | -12 | no |
| Freddo | 1.10 | 1.08 | 0.96 | 0 | 0 | 200 | no |
| Seppia | 0.90 | 1.00 | 1.00 | 0.85 | 0 | 0 | no |
| Matte | 0.90 | 0.88 | 1.05 | 0 | 0 | 0 | no |
| HDR | 1.50 | 1.22 | 1.02 | 0 | 0 | 0 | no |
| Cross | 1.30 | 1.12 | 1.00 | 0 | 0 | 30 | no |

### 4.4 Luce (cursori -100..100, default 0)

Esposizione, Contrasto, Alte luci, Ombre, Bianchi, Neri.

### 4.5 Colore (cursori -100..100)

Temperatura, Tinta, Vividezza, Saturazione.

### 4.6 Mixer colore (HSL)

Tre settori (tab): Tonalita, Saturazione, Luminanza. In ciascuno, gli 8 colori con cursore
-100..100: Rosso, Arancione, Giallo, Verde, Acqua, Blu, Viola, Magenta. In produzione e un vero
HSL selettivo per gamma di tinta (non un'approssimazione globale): agisce colore per colore sui
pixel reali. Tonalita sposta la tinta del colore, Saturazione la intensita, Luminanza la luce.

### 4.7 Dettaglio ed effetti

Nitidezza, Chiarezza, Texture, Foschia (cursori -100..100), Vignettatura, Grana (0..100).
Vignettatura e grana sono livelli reali sull'immagine.

### 4.8 Curve (tonale e RGB)

Editor multi-punto professionale, per quattro canali: master RGB, e R, G, B separati.

- Aggiungere un punto: clic o tocco sulla linea, ovunque.
- Modificare: trascinare il punto. Gli estremi si muovono solo in verticale, i punti centrali anche
  in orizzontale (vincolati tra i vicini).
- Rimuovere: doppio clic o doppio tocco sul punto (gli estremi non si rimuovono).
- Reset: pulsante "Reset curva" per il canale attivo.

Resa: nell'anteprima si usa una `feComponentTransfer` SVG con `tableValues` per canale (vedi i file
design). La master si applica come composizione sopra i canali. In produzione, stessa logica come
LUT reale per canale nella pipeline di resa finale.

### 4.9 Confronto originale

Pulsante "Tieni premuto: originale": mentre e premuto mostra l'immagine senza modifiche, al rilascio
torna alla versione modificata.

### 4.10 Modifiche conversazionali ("Dimmi cosa cambiare")

Campo testo (e suggerimenti rapidi) sopra i pannelli. L'utente scrive in linguaggio naturale ("piu
caldo", "schiarisci il viso", "togli lo sfondo", "bianco e nero") e l'editor applica. Implementazione
consigliata: una route server che usa la stessa Claude API dell'enhancer per tradurre la frase in un
JSON di delta sui parametri dell'editor (esposizione, temperatura, preset, sfondo, ecc.), poi il
client li applica. Mantenere una mappa di parole chiave come fallback offline.

### 4.11 Esporta (in fondo)

Apre un pannello con:

- Upscale: 2K o 4K (UNICO posto dove vive l'upscale). Porta l'immagine ad alta risoluzione mantenendo
  identita e dettagli. Aggiunge un supplemento compute.
- Formato per piattaforma: IG post (4:5), Storia (9:16), LinkedIn (1.91:1), E-commerce (1:1).
- "Scarica con provenienza": riusa il download col certificato e la filigrana invisibile esistenti.
- "Condividi come Storia": riusa `ShareStoryButton` esistente.

### 4.12 Pipeline tecnica dell'editor

- Anteprima live: lato client, immediata (CSS filters per i parametri base, canvas o WebGL per curve
  e HSL se serve fedelta). Deve restare fluida su mobile.
- Resa finale: lato server con `sharp` (gia in dipendenze) sull'immagine pulita: applica preset +
  regolazioni (luce, colore), HSL selettivo, curve come LUT, dettaglio, vignettatura e grana, poi
  l'upscale e infine la filigrana invisibile e il certificato come gia avviene. L'export ritaglia
  nel formato scelto.
- Salvataggio non distruttivo: lo stato dell'editor si serializza in un jsonb su `generations`
  (vedi modello dati), cosi la modifica e riapribile e riproducibile.

## 5. Integrazione col codice esistente

File coinvolti (riferimento, gia letti):

- `app/match/MatchClient.tsx` : UI di ricerca e generazione. Qui va il redesign della Parte A
  (pose sotto il prompt, picker inquadratura ed espressione, stile colore, look fotografico,
  avvio per obiettivo). Mantieni la logica di match, VOLT, async job, enhancer.
- `app/api/generate/route.ts` : aggiungi i campi nuovi (camera, lens, light, colorStyle, framing,
  expression) con whitelist server; estendi `buildEchoPrompt` col segmento fotografico; persisti il
  look usato.
- `lib/poses.ts` : sorgente pose, gia pronta. Il picker legge `/api/poses`.
- `lib/engines/echo.ts` : motore (nessuna modifica necessaria, eventualmente l'upscale).
- `app/api/enhance-prompt/route.ts` : riuso per "Migliora prompt" e base per le modifiche conversazionali.
- Nuovo: una route per la resa/esportazione dell'editor (es. `app/api/edit` o estensione del
  download) che applica lo stato editor con `sharp`, fa l'upscale e produce il file finale certificato.
- `ShareStoryButton`, watermark, certificate, references, VOLT: riusati come oggi.

## 6. Modello dati (additivo)

Su `generations`, colonne additive (nessun dato biometrico):

| colonna | tipo | note |
|---|---|---|
| camera | text \| null | enum macchina |
| lens | text \| null | enum ottica |
| light | text \| null | enum luce |
| color_style | text \| null | enum stile colore |
| framing | text \| null | enum inquadratura |
| expression | text \| null | enum espressione |
| edit_state | jsonb \| null | stato editor: preset, intensity, grain, luce, colore, hsl, curve, vignette |
| upscale | text \| null | 2k \| 4k |
| export_format | text \| null | ig \| story \| li \| ecom |

Struttura consigliata di `edit_state`:

```
{
  "preset": "Cinema", "intensity": 0.85, "grain": 0,
  "light": {"exp":0,"con":0,"hi":0,"sha":0,"wh":0,"bl":0},
  "color": {"temp":0,"tint":0,"vib":0,"sat":0},
  "detail": {"sharp":0,"clar":0,"tex":0,"haze":0,"vig":0,"grain":0},
  "hsl": {"hue":{...8 colori},"sat":{...},"lum":{...}},
  "curves": {"rgb":[[0,0],[100,100]],"r":[...],"g":[...],"b":[...]}
}
```

## 7. Criterio di "fatto" (definition of done)

Studio:

- [ ] Parto da "Cosa vuoi creare", scelgo un obiettivo e i parametri si preimpostano.
- [ ] Le pose sono sotto il prompt, in un pannello a icone, raggruppate per categoria.
- [ ] Inquadratura ed espressione sono picker a icone, selezione singola.
- [ ] Stile colore, macchina, ottica (con mm), luce funzionano e finiscono nel prompt.
- [ ] Le immagini di riferimento hanno ruolo, descrizione e vincolo di un solo outfit.
- [ ] Il prompt finale mostra i token; il backend li compone in `buildEchoPrompt` da whitelist.
- [ ] Genero con ECHO, consenso, royalty, certificato e VOLT invariati.

Editor:

- [ ] Compare dopo la generazione, immagine fissa, parametri a tendina su mobile.
- [ ] Preset con intensita, Luce, Colore, Mixer colore HSL (3 settori, 8 colori), Dettaglio.
- [ ] Curve multi-punto: aggiungo, trascino, doppio tocco per togliere, reset per canale, master e RGB.
- [ ] Vignettatura e grana reali. Confronto con l'originale tenendo premuto.
- [ ] "Dimmi cosa cambiare" applica modifiche da linguaggio naturale.
- [ ] Upscale SOLO in Esporta. Formati per piattaforma. Scarica con provenienza. Condividi come storia.
- [ ] Tutto non distruttivo, `edit_state` salvato e riapribile.
- [ ] Identico ai file `design/anteprima_editor_mobile.html` e `..._postproduzione.html`.

## 8. Prompt pronto da incollare in Claude Code

```
Stiamo costruendo il restyling dello studio di generazione (/match) e un nuovo editor di post
produzione per SEMBLIC. Apri e usa come riferimento visivo questi file gia nella repo:
- design/anteprima_match_mobile.html (studio generazione, mobile, canonico)
- design/anteprima_match_studio_redesign.html (studio, desktop)
- design/anteprima_editor_mobile.html (editor, mobile, canonico)
- design/anteprima_editor_postproduzione.html (editor, desktop)
Leggi anche: CLAUDE.md, docs/SEMBLIC_STUDIO_EDITOR_BUILD_SPEC.md (questa spec) e
docs/STUDIO_GEN_CAMERA_EDITING_SPEC.md.

Obiettivo: ricreare ESATTAMENTE quelle interfacce e quei comportamenti nel prodotto reale.
Mobile-first. Stack Next.js + Tailwind + Supabase. Motore ECHO invariato. Chiavi solo lato server.
Palette SEMBLIC, bottoni Amber pieni, niente trattini lunghi nei testi. Editing non distruttivo.

Procedi a piccoli passi verificabili e fermati per la mia conferma a ogni passo. Inizia con un piano:
1) redesign di app/match/MatchClient.tsx (pose sotto il prompt, picker inquadratura/espressione,
   stile colore, look fotografico, avvio per obiettivo); 2) campi nuovi in app/api/generate/route.ts
   e estensione di buildEchoPrompt da whitelist; 3) editor di post produzione (componente + route di
   resa con sharp: preset, luce, colore, HSL, curve, dettaglio, vignetta, grana, upscale, esporta);
   4) modello dati (colonne additive + edit_state). Aspetta il mio ok prima di scrivere codice.
```
