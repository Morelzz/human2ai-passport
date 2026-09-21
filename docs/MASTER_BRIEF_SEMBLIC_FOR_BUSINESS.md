# MASTER BRIEF: Semblic for Business (tutti i 20 tool)

Messaggio unico e completo per riprendere il lavoro in Claude Code. Contiene la mappa di tutti e venti
i tool (vecchi e nuovi), le decisioni, i vincoli, l'ordine di costruzione e un prompt pronto da
incollare. Questo file e la fonte di verita per la linea Business. Data: 2026-06-18.

## La visione

Diventare lo standard dell'AI per le piccole imprese italiane. Prendere l'azienda piccola, darle
strumenti che sembrano difficili e renderli facili, snelli, intuitivi. Potenti quanto semplici.

## Le 5 decisioni gia prese

1. Cosa: una suite di 20 tool AI per PMI, sotto-brand "Semblic for Business".
2. Come: web-first (Next.js + Supabase). Desktop solo come agente sottile dove serve.
3. Dove: sezione `/business` di semblic.com, stessa identita visiva del core.
4. Flagship: tool 2 "Studio Contenuti" (rotta `/business/contenuti`, nome pubblico proposto "Semblic Content").
5. Disciplina: si costruisce un solo tool per volta, gli altri restano roadmap.

## Mappa completa dei 20 tool

Legenda tipo: W = web, D = desktop, H = ibrido. Sinergia = legame col core (avatar consenzienti).

### Prima ondata (1-10)

| # | Tool | Categoria | Tipo | Priorita | Sinergia | Spec |
|---|---|---|---|---|---|---|
| 1 | Amministrazione e fatture | Amministrazione | H | P2 | bassa | SPEC_P2 (D) |
| 2 | Studio Contenuti | Marketing contenuti | W | P1 flagship | alta | SPEC (A) |
| 3 | Assistente clienti | Customer care chat | W | P2 | media | SPEC_P2 (E) |
| 4 | Radar recensioni | Reputazione | W | P3 | bassa | SPEC_P3 (G) |
| 5 | Preventivi e contratti | Documenti e legale | W | P1 | alta | SPEC (B) |
| 6 | CRM leggero | Vendite | W | P3 | bassa | SPEC_P3 (H) |
| 7 | Cervello aziendale | Knowledge interna | H | P2 | media | SPEC_P2 (F) |
| 8 | Email e riunioni | Produttivita | H | P3 | bassa | SPEC_P3 (I) |
| 9 | Sito e SEO locale | Presenza web | W | P3 | media | SPEC_P3 (J) |
| 10 | Compliance GDPR | Legale e privacy | H | P1 | alta | SPEC (C) |

### Seconda ondata (11-20), categorie nuove

| # | Tool | Categoria | Tipo | Sinergia | Spec |
|---|---|---|---|---|---|
| 11 | Bandi e incentivi | Finanza agevolata | W | bassa | WAVE2 (K) |
| 12 | Prenotazioni e appuntamenti | Agenda e front-desk | W | bassa | WAVE2 (L) |
| 13 | Centralino AI | Voce e telefonia | W cloud | media | WAVE2 (M) |
| 14 | Magazzino e previsione domanda | Operations e supply | H | bassa | WAVE2 (N) |
| 15 | Turni e personale | HR operations | W | bassa | WAVE2 (O) |
| 16 | Pricing e margini | Finanza e strategia | W | bassa | WAVE2 (P) |
| 17 | Pubblicita e campagne | Advertising | W | alta | WAVE2 (Q) |
| 18 | Fidelizzazione e email marketing | Retention | W | media | WAVE2 (R) |
| 19 | Acquisti e fornitori | Procurement | W | bassa | WAVE2 (S) |
| 20 | Cruscotto direzionale AI | Business intelligence | W | alta | WAVE2 (T) |

## File del progetto (linea Business)

- `docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md` : strategia, prezzo, roadmap, guardrail.
- `docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md` : tool A, B, C (mappa 2, 5, 10).
- `docs/SEMBLIC_BUSINESS_TOOLS_SPEC_P2.md` : tool D, E, F (mappa 1, 3, 7).
- `docs/SEMBLIC_BUSINESS_TOOLS_SPEC_P3.md` : tool G, H, I, J (mappa 4, 6, 8, 9).
- `docs/SEMBLIC_BUSINESS_TOOLS_SPEC_WAVE2.md` : tool K-T (mappa 11-20).
- `design/mockup_business_studio_contenuti.html` : mockup di dettaglio del flagship.
- `design/anteprima_10_tool.html` : anteprima interattiva dei primi 10 tool.

## Vincoli (dal CLAUDE.md)

- Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase. Niente over-engineering.
- Chiavi e segreti AI e Supabase solo lato server, mai nel client. Mai committare `.env.local`.
- Palette SEMBLIC: Obsidian/Lumen/Amber, stati salvia e coral. Bottoni Amber pieni, mai gradienti.
- Testi pubblici: mai trattini lunghi, usare virgole, due punti o parentesi.
- Privacy by default, nessun addestramento sui dati del cliente senza consenso.

## Decisioni tecniche trasversali

- Profilo "brand voice" (Tool A) riusato da molti tool per scrivere nel tono dell'azienda.
- Motore di ricerca su documenti (embedding con pgvector) condiviso tra Assistente clienti (3),
  Cervello aziendale (7) e Centralino AI (13). Si costruisce una volta.
- Testo in overlay sulle immagini: livello separato e modificabile, non cotto dal motore AI.
- Human in the loop dove si pubblica, si invia o si spende (contratti, compliance, ads, recensioni).
- Un solo account e un solo wallet Semblic per core e business.

## Ordine di costruzione consigliato

Un passo alla volta, con un cancello tra le fasi (si avanza solo con numeri veri di utilizzo):

1. Fase 0: landing `/business` con waitlist (costo quasi zero, misura l'interesse).
2. Flagship: MVP del Tool 2 (Studio Contenuti), end to end.
3. Magneti ad alto richiamo: Tool 11 (Bandi e incentivi) e Tool 12 (Prenotazioni), facili da capire e
   con forte valore percepito.
4. DNA Semblic: Tool 5 (Contratti) e Tool 10 (Compliance), vicini al core.
5. Motore RAG condiviso, poi i tool che lo usano: 3, 7, 13.
6. Capstone finale: Tool 20 (Cruscotto direzionale), che aggrega i dati degli altri.

## Prompt pronto da incollare in Claude Code

Copia il blocco come primo messaggio in Claude Code, dentro la cartella del progetto.

```
Stiamo costruendo "Semblic for Business", una suite di 20 tool AI per PMI, dentro questa repo.

Leggi e rispetta questi file prima di tutto:
- CLAUDE.md (vincoli di progetto e stile)
- docs/MASTER_BRIEF_SEMBLIC_FOR_BUSINESS.md (mappa dei 20 tool e ordine di build)
- docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md (strategia)
- docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md, _P2.md, _P3.md, _WAVE2.md (spec dei 20 tool)
- design/mockup_business_studio_contenuti.html e design/anteprima_10_tool.html (riferimenti UI)

Regole non negoziabili: web-first (Next.js + Tailwind + Supabase), chiavi AI e Supabase
solo lato server, palette SEMBLIC (Obsidian/Lumen/Amber, bottoni Amber pieni), niente
trattini lunghi nei testi pubblici, privacy by default, human in the loop dove si pubblica
o si spende. Usa dati demo. Costruiamo un tool alla volta.

Obiettivo di questa prima sessione: l'MVP del Tool 2 "Studio Contenuti" (rotta
/business/contenuti), seguendo la sezione TOOL A della spec. Il testo in overlay sulle
immagini deve essere un livello separato, non cotto nell'immagine.

Procedi a piccoli passi verificabili. Inizia proponendomi: 1) lo schema Supabase
(biz_brand_profiles, biz_content_items), 2) le pagine e le rotte, 3) l'ordine di lavoro.
Fermati e aspetta il mio ok prima di scrivere codice.
```

## Punti aperti

- Nome definitivo del flagship (proposto "Semblic Content", rotta `/business/contenuti`).
- Prezzi: da validare con i concorrenti italiani prima del lancio.
- Anteprima viva della seconda ondata (tool 11-20): da aggiungere, se vuoi, a `design/anteprima_10_tool.html`.
