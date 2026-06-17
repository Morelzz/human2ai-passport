# CLAUDE.md — Contesto di progetto SEMBLIC

> Questo file viene letto automaticamente da Claude Code a ogni sessione.
> È la fonte di verità su cosa stiamo costruendo e come.

## Cosa stiamo costruendo ADESSO

Il **Registro Volti / Avatar Passport** — il primo modulo atterrabile di Semblic.
NON stiamo costruendo tutta la piattaforma. Stiamo costruendo UNA cosa, fatta bene:

> Un registro pubblico dove una persona reale rivendica il proprio volto, dichiara
> come può essere usato, e **chiunque può verificarlo** tramite un token.

Questo è il seme della "SIAE dei volti": prima diventiamo il *registro dei diritti*,
poi (in trimestri futuri) ci aggiungiamo generazione, royalty ed enforcement.

Spec completa del modulo: vedi `docs/AVATAR_PASSPORT_SPEC.md`.

## Cos'è Semblic (contesto, NON da costruire ora)

Semblic è il **filtro obbligatorio di tutela umana** che sta prima di ogni generazione
di un essere umano. Tesi: in futuro generare un umano senza diritto d'immagine sarà
impossibile; chi genera deve passare da un catalogo di persone reali consenzienti, che
vengono pagate. Posizionamento: "il registro fidato delle identità AI consenzienti".
NON è un generatore di immagini — i motori (Higgsfield, HeyGen, ElevenLabs) sono terze
parti invisibili. Semblic è la tutela dell'umano + i binari di diritti e pagamenti.

## Stack tecnico (deciso — non cambiare senza chiedere)

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (Postgres + Auth) — credenziali SOLO in variabili d'ambiente lato server
- **Deploy:** Vercel (più avanti)
- **Hashing token:** SHA-256 via Web Crypto API / Node crypto (nessuna libreria esterna pesante)

Mantieni il progetto **monorepo singolo, semplice**. Niente over-engineering. Questo è un MVP
che deve girare, non una cattedrale.

## Palette e identità visiva (SEMBLIC: Obsidian / Lumen / Amber)

> **Dal 2026-06-17 il brand è SEMBLIC** (rebrand da Human2AI). Estetica minimale,
> premium, dark-first: titoli display ultra-sottili (peso 200, tracking -0.04em),
> geometria a PILLOLA (raggio pieno sui bottoni), bordi hairline, vuoto che respira.
> UN solo colore d'azione: Amber. Gli stati sono coral (bloccato) e salvia
> (verificato), significato di prodotto, non decorazione. Sorgente di verita:
> `SEMBLIC_COLORI_MIGRAZIONE.md` (8 token + 3 gradienti).
> NB tecnica: i token CSS storici (`--color-violet`, `text-crimson`, `text-teal`,
> `bg-obsidian-2/3`) ora sono ALIAS coi nuovi valori, vedi `app/globals.css` e
> `lib/ui.ts`. Il testo usa Lumen a opacita, mai grigi. I bottoni sono Amber
> PIENO (testo `--on-amber` `#412402`), mai gradienti. I tier si distinguono per
> intensita, mai per tinta.

- Identita: **Obsidian `#0C0F17`** (sfondo) · **Lumen `#F2E9D8`** (testo/logo) · **Amber `#F2A93B`** (azione, hover `#E29A2E`)
- Superfici: `#141A24` (card) · `#1E2530` (input/modali) · `#2C3440` (linee)
- Stati: **coral `#EE7A70`** (bloccato/no-match) · **salvia `#7FAE96`** (verificato/consenso)
- Gradienti (SOLO sfondi/sezioni, mai bottoni): tramonto (amber→coral), aurora (amber→obsidian), fiducia (salvia→teal)
- Payoff brand: "Real Humans. Real Rights. Real Earnings."
- Estetica: premium, elegante, avanguardia, futuristica. ZERO aspetto "giocattolo" o marketing generico.

## Regole NON NEGOZIABILI (guardrail)

1. **Mai dati biometrici o personali on-chain.** Vincolo GDPR assoluto. Se in futuro si ancora
   qualcosa su blockchain, va SOLO l'hash anonimo, mai foto/volti/documenti.
2. **Il consenso è una timeline, non uno stato fisso.** Un avatar è "autorizzato dal–al",
   con eventuale "revocato dal X". La revoca è PROSPETTICA (blocca il futuro, non cancella il passato).
3. **Privacy by default.** Nessuna vendita di dati, mai. I dati sensibili stanno lato server.
4. **Onestà sui livelli.** SPARK/SHAPE = "ispirato a" (no fedeltà 1:1). SOUL/HUMAN = identity-locked.
5. **Credenziali API e segreti** sempre e solo in `.env.local` (mai committati, mai nel client).

## Convenzioni di lavoro

- **Stile dei testi (regola di Morelz): MAI usare trattini lunghi (— o –) negli
  articoli, nei copy o in qualsiasi testo destinato al pubblico.** Usare virgole,
  due punti o parentesi, come scrivono gli umani.
- Spiega sempre brevemente cosa stai per fare prima di farlo.
- Procedi a piccoli passi verificabili; dopo ogni step, dimmi cosa testare.
- Codice commentato in italiano dove aiuta la comprensione.
- Usa dati DEMO finché non si decide di passare ai 15 avatar reali.
- Prima di scelte architetturali importanti, fermati e chiedi.

## Stato attuale

- Progetto nuovo. Da inizializzare.
- 15 avatar reali già scansionati su Higgsfield Soul (NON ancora caricati — useremo demo).
- Primo obiettivo: Avatar Passport pubblico + verifica token, popolato con dati demo.
