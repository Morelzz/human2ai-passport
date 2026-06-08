# Worker ECHO async — deploy su Railway

> Il sito pubblico sta su **Vercel** (piano Hobby, funzioni capate a ~60s): lì le
> generazioni ECHO vengono solo **messe in coda** (`generation_jobs`). Le chiamate
> lunghe a OpenAI (2K/4K, anche minuti) le esegue un **worker** su **Railway**, che
> NON ha quel limite. Stessa app, stesso codice, stessa Supabase: zero duplicazione.

## Architettura
```
Vercel (sito)  --crea job-->  Supabase (generation_jobs)  <--esegue--  Railway (worker)
  enqueue, ritorna jobId         coda condivisa              next start + poller
```
- **Vercel**: NON deve avere `WORKER_SECRET` → la sua rotta /api/jobs/run resta disattivata (giusto così).
- **Railway**: ha `WORKER_SECRET` → esegue i job. Un solo servizio fa girare server Next + poller (`npm run start:railway` → `worker/start-prod.mjs`).

## Prerequisito: push su GitHub
Railway e Vercel deployano dal repo. Quindi prima:
```
git push origin master
```
⚠️ Questo aggiorna ANCHE il sito Vercel con tutto il lavoro non ancora online.

## Passi su Railway
1. **railway.app → Sign in** (con GitHub).
2. **New Project → Deploy from GitHub repo →** scegli `Morelzz/human2ai-passport`.
3. Railway rileva Next.js e fa il build. Poi in **Settings → Deploy → Custom Start Command** metti:
   ```
   npm run start:railway
   ```
4. **Variables** → aggiungi (gli stessi valori di Vercel/.env.local):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `HIGGSFIELD_API_KEY`, `HIGGSFIELD_API_SECRET`, `HIGGSFIELD_MODE=live`
   - `WORKER_SECRET` = una stringa lunga a caso (vale SOLO qui, non su Vercel)
   - *(PORT lo imposta Railway da solo; il poller punta a localhost.)*
5. **Deploy**. Nei log del servizio devi vedere `[worker] avviato …` e, alla prima
   generazione, `[ECHO job …] done · … · reale=…€`.

## Verifica
Sul sito Vercel: /match → ECHO → genera. Il job appare in `generation_jobs` (pending),
Railway lo prende (running → done), l'immagine compare nel sito + il badge "+1" in Account.

## Note
- Le foto-reference dei creatori reali stanno in Supabase Storage (`references/{handle}`),
  quindi il worker le legge ovunque. (Mario in locale usa una cartella via env: per usarlo
  in prod, caricare le sue reference su Storage una volta.)
- Reggi più worker? Sì: il claim è atomico (pending→running), niente doppie esecuzioni.
- Costo Railway: ha un piano gratuito/limitato; un servizio piccolo basta (il worker è leggero,
  lavora solo durante le generazioni).
