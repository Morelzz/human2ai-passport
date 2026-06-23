# Pagina /tutela — Tutela dell'identità (design)

Data: 2026-06-23

## Obiettivo
Pagina pubblica di riferimento che spiega come Semblic tutela l'identità: verifica
KYC (Didit) + confronto del volto verificato con le foto dell'avatar (faceprint
128-d, blocco se non combacia, nessuna foto salvata). Serve tre pubblici in una
sola pagina: pubblico/fiducia, creatori, aziende. Stile cinematic Semblic.

## Collocazione
- Route: `/tutela` (`app/tutela/page.tsx`), server component come le altre marketing.
- Nav: nuova voce "Tutela" nel gruppo "Il tuo volto" della `Navbar`.
- Richiami: link da `/trasparenza` e dal footer (zona fiducia). Facoltativi, non bloccanti.

## Struttura (cuore + pilastri)
1. Hero centrato sul confronto volto: eyebrow "TUTELA DELL'IDENTITA'", titolo display
   ultra-sottile "Il tuo volto entra nel registro solo se sei davvero tu.", subline,
   grafica del flusso Verifica -> Faceprint -> Confronto con esito salvia (stessa
   persona) / coral (403 bloccato). CTA: "Proteggi il tuo volto" (`/signup/avatar`)
   + "Verifica con Sigil" (`/verify`).
2. 4 pilastri (grid 2x2 desktop, 1 colonna mobile), icona amber + titolo + 1-2 righe + link:
   - Verifica reale: documento + selfie liveness.
   - Confronto volto: le foto dell'avatar devono combaciare col volto verificato.
   - Privacy by design: nessuna foto, solo 128 numeri; mai biometrico on-chain. Link `/privacy`.
   - Consenso e revoca: vale da quando autorizzi finche vuoi, revoca prospettica; o Ward. Link `/ward`.
3. (Opzionale) sezione "Passo per passo" che espande il flusso, riuso dello schema.
4. Closing CTA: "Real Humans. Real Rights." + "Entra nel registro" (`/signup/avatar`).

## Stile
Riuso dei pattern cinematic gia' a terra: `CineBackground`, `SiteNav`, componente
`Reveal` (rise + settle in scala), `.glass`, `font-extralight tracking-[-0.04em]`,
hairline tramonto, glow radiale amber tematico. Token da `lib/ui` / `app/globals.css`.
Curato su mobile E desktop (regola fissa).

## Copy / vincoli
- Italiano. MAI trattini lunghi (— o –): virgole, due punti, parentesi.
- Onesta: il meccanismo si scrive al presente come nostro metodo/standard (il codice
  c'e'), ma niente claim "live" specifici finche' il gate non e' deployato e provato.
  Pubblicare la pagina IN COPPIA col fix del confronto volti
  (`next.config.ts` outputFileTracingIncludes, vedi memoria vercel-serverless-face-embed).

## Non-goal (YAGNI)
- Niente racconto esteso NO FAKES Act / Sigil deep / consenso tecnico: restano nelle
  pagine dedicate, qui solo linkati.
- Niente nuove API o tabelle: pagina di solo contenuto + link.

## Verifica
- `tsc` + build verdi.
- QA per MISURA a 375 (mobile) e desktop: nessun overflow orizzontale, fit dei
  pilastri, tap target adeguati (animazioni congelate nel preview, si misura).
