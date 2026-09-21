# Brief di passaggio: Semblic for Business

Serve a riprendere questo lavoro in Claude Code (o in una nuova sessione), senza perdere contesto.
Data: 2026-06-18.

## Dove siamo

Abbiamo definito una nuova linea, "Semblic for Business": strumenti AI per piccole imprese, sotto
l'ombrello Semblic. Per ora c'e solo materiale di strategia, spec e un mockup. Nessun codice scritto.

## Le 5 decisioni gia prese

1. Cosa: una suite di tool AI per PMI, sotto-brand "Semblic for Business".
2. Come: web-first nello stack attuale (Next.js + Supabase). Desktop solo come agente sottile dove serve.
3. Dove: sezione `/business` di semblic.com, stessa identita visiva del core.
4. Flagship: il tool "Studio Contenuti" (generatore di contenuti con brand voice).
5. Disciplina: si costruisce un solo tool flagship per volta, gli altri restano roadmap.

## File gia prodotti (nella repo)

- `docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md` : strategia, i 10 tool con priorita, prezzo, roadmap, guardrail.
- `docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md` : spec dei 3 tool P1 (Studio Contenuti, Contratti, Compliance).
- `docs/SEMBLIC_BUSINESS_TOOLS_SPEC_P2.md` : spec dei 3 tool P2 (Fatture, Assistente clienti, Cervello aziendale).
- `design/mockup_business_studio_contenuti.html` : mockup UI del flagship (apri nel browser).

## Vincoli da rispettare (dal CLAUDE.md)

- Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase. Niente over-engineering.
- Chiavi e segreti AI/Supabase solo lato server, mai nel client. Mai committare `.env.local`.
- Palette SEMBLIC: Obsidian/Lumen/Amber, stati salvia e coral. Bottoni Amber pieni, mai gradienti.
- Testi pubblici: mai trattini lunghi, usare virgole, due punti o parentesi.
- Privacy by default, nessun addestramento sui dati del cliente senza consenso.

## Decisioni tecniche chiave gia fissate

- Testo in overlay sull'immagine: livello separato e modificabile (SVG o canvas), col font del brand
  e limite di caratteri. NON cotto nell'immagine dal motore AI. Fusione immagine + testo in PNG lato server.
- Pubblicazione automatica sui social: fase 2 (API Meta e LinkedIn). In MVP: scarica e pubblica a mano.
- Catena AI: chiavi lato server. Per i tool con ricerca su documenti (Assistente clienti, Cervello
  aziendale) si usa pgvector su Supabase per gli embedding.

## Punti ancora aperti

- Nome definitivo del flagship: proposto "Semblic Content" su rotta `/business/contenuti`
  (evitare conflitto con `/studio`, che e lo studio avatar del core).
- Prezzi: indicativi, da validare con i concorrenti italiani prima del lancio.

## Prossimo passo consigliato

Due opzioni, una alla volta:

1. Fase 0: landing `/business` con waitlist (costo quasi zero, misura interesse prima di costruire).
2. MVP del flagship: costruire lo Studio Contenuti end to end secondo la spec.

## Prompt pronto da incollare in Claude Code

Copia il blocco qui sotto come primo messaggio in Claude Code, dentro la cartella del progetto.

```
Contesto: stiamo costruendo la linea "Semblic for Business" dentro questa repo.
Leggi prima questi file e rispettali:
- CLAUDE.md (vincoli di progetto e stile)
- docs/SEMBLIC_FOR_BUSINESS_STRATEGY.md (strategia e priorita)
- docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md (spec dei 3 tool P1)
- design/mockup_business_studio_contenuti.html (mockup del flagship)

Obiettivo di questa sessione: costruire l'MVP del tool flagship "Studio Contenuti"
(rotta /business/contenuti), seguendo la sezione "TOOL A" della spec.

Regole: web-first (Next.js + Tailwind + Supabase), chiavi AI e Supabase solo lato
server, palette SEMBLIC (Obsidian/Lumen/Amber, bottoni Amber pieni), niente trattini
lunghi nei testi pubblici. Il testo in overlay e un livello separato, non cotto
nell'immagine. Usa dati demo.

Procedi a piccoli passi verificabili. Inizia proponendo: 1) lo schema Supabase
(tabelle biz_brand_profiles e biz_content_items), 2) le rotte/pagine da creare,
3) l'ordine di lavoro. Fermati e aspetta il mio ok prima di scrivere codice.
```
