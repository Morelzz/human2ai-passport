# Semblic in cloud e sul PC

Dal 28 settembre 2026 Morelz lavora anche dalle sessioni cloud, che vedono solo GitHub. Qui c'e' cosa si fa dove. Per lo stato dei lavori e le regole leggi prima `RIPRESA.md`.

## Il ramo

- Il lavoro vive sul ramo `notte-27-settembre`. Si parte da li' e ogni passo finisce con commit e push **del ramo**.
- `master` e' il sito: un push su `master` pubblica semblic.com (Vercel). Si unisce il ramo a `master` solo quando Morelz scrive "pubblica".
- Un push del ramo fa solo un'anteprima privata su Vercel: il sito vero non cambia.
- Chi riprende sul PC dopo il cloud fa prima `git pull` del ramo; chi passa al cloud fa prima `git push`.

## Cosa si fa in cloud

- Scrivere e cambiare il codice, i mockup in `design/`, i testi.
- Controlli: `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Commit e push del ramo.

## Cosa si fa solo sul PC di Morelz (o in cloud solo con le chiavi)

- **Le chiavi segrete** (`.env.local`: Supabase, OpenAI, Anthropic, Higgsfield, Stripe) non sono nel repository. Senza, in cloud non si genera e non si parla col database vero. Se servono in cloud vanno messe nelle impostazioni dell'ambiente cloud, mai nel codice.
- **Generare foto** con l'account interno (script in `.tmp/`, che non e' nel repository).
- **Il database Supabase** (progetto H2AI): le modifiche SQL si applicano dal pannello SQL nel Chrome del PC. I file SQL stanno in `supabase/` e dicono se sono gia' applicati.
- **Provare il sito dal vivo** su http://localhost:3000 con la sessione di prova, e i mockup su http://127.0.0.1:8767.
- **Pubblicare** (push su `master`) solo dopo "pubblica".
- Le memorie di Claude stanno sul PC: in cloud valgono `RIPRESA.md` e questo file.

## Non nel repository

- `.tmp/` (script di prova, foto generate), `.env.local` (chiavi).
- `.impeccable/review/` (100 MB di schermate di revisione della skill di design): resta sul PC.

## Da sapere

- Il credito OpenAI e' finito il 27/9 sera: finche' Morelz non lo ricarica nessuno genera foto, ne' in locale ne' online.
- Il Supabase di Semblic (piano gratuito) ha sforato il traffico in cache delle immagini (9 GB su 5). Proposte: piano Pro (25 dollari) e immagini piu' leggere (WebP, miniature, cache lunga).
