# MULTI-ENGINE — Generazione condizionata da reference (architettura)

> Stato: **SPEC** (decisione presa, da costruire quando ci sono le chiavi API).
> Fonte vision: idea utente 2026-06-08. Non è "abbellimento": è struttura core.
> Vincoli da `CLAUDE.md`: i motori sono **terze parti invisibili**; consenso = timeline;
> niente dati biometrici on-chain; onestà sui livelli.

## 1. Tesi
HUMAN2AI non genera: è il **filtro del consenso** sopra i motori. L'identità di una
persona reale è il nostro **asset proprietario**. Vogliamo poter usare il **miglior motore
disponibile** (oggi Higgsfield Soul; domani GPT Image 2, Nano Banana Pro, altri) senza mai
perdere la **fedeltà** dell'avatar né il **controllo del consenso**.

## 2. L'idea chiave: reference-set canonico per avatar
I modelli generalisti di nuova generazione accettano **molte immagini di riferimento**:
- **GPT Image 2** (OpenAI, edit endpoint): fino a **10** reference per character consistency.
- **Nano Banana Pro** (Gemini 3 Pro Image): fino a **14** immagini (max 5 persone), mantiene
  la coerenza identità tra le generazioni.

Per ogni avatar conserviamo un **set canonico di reference** (le foto reali e consensuali),
ad es. 7 angoli cruciali:
1. corpo intero frontale · 2. corpo intero di spalle · 3. profilo dx · 4. profilo sx
· 5. ritratto dall'alto · 6. ritratto dal basso · 7. ritratto neutro frontale.

> Nota: per il Soul l'utente ha già fornito **15 foto reali** → la materia prima per il
> reference-set esiste già. Con 10–14 reference l'identity-lock arriva **molto vicino** a
> quello di un Soul addestrato.

A ogni generazione, **lato server e in modo invisibile al compratore**, componiamo:
```
[ img1 … imgN del reference-set ]
+ suffisso di sistema nascosto: "usa queste immagini come riferimento del soggetto,
  mantieni l'identità, la corporatura e i tratti del volto"
+ <prompt del compratore, sanitizzato>
```
Il compratore non vede né tocca i reference. Il motore è invisibile.

## 3. Scala dei tier (il motore è scelto dietro le quinte)
Naming per **livello di fedeltà/uso**, NON per motore (i motori restano invisibili).

| Tier | Fedeltà | Motore (interno) | Uso |
|------|---------|------------------|-----|
| **SPARK** | ispirato a (no 1:1) | Higgsfield | bozza / mood |
| **SHAPE** | ispirato a, forma definita | Higgsfield Soul ID (v1) | concept |
| **SOUL** | identity-locked | Higgsfield Soul (addestrato) | fedele |
| **HUMAN** | identity-locked top | Higgsfield Soul 2.0 | fedele alta risoluzione |
| **TWIN** *(nuovo)* | identità 360° da reference-set completo | Nano Banana Pro / GPT Image 2 | massima somiglianza |
| **ECHO** *(nuovo)* | fotorealismo commerciale premium, 4K, testo-in-immagine | GPT Image 2 / Nano Banana Pro | scene commerciali top |

*(Nomi CONFERMATI dall'utente 2026-06-08: **TWIN** + **ECHO**.)*
Il routing motore→tier è **interno**: la piattaforma sceglie il motore migliore per la
richiesta (es. testo nell'immagine → GPT Image 2; blend multi-persona → Nano Banana Pro).

## 4. Flusso di generazione (engine-agnostic)
```
richiesta compratore
  → 1. GATE CONSENSO: l'uso richiesto rientra nelle categorie autorizzate dall'avatar? (NOI, pre-generazione)
  → 2. SANITIZZA il prompt del compratore (anti prompt-injection: non può sovrascrivere identità/categorie)
  → 3. COMPONI: reference-set + suffisso identità nascosto + prompt sanitizzato
  → 4. ENGINE ADAPTER: invia al motore del tier scelto (Higgsfield | GPT Image 2 | Nano Banana)
  → 5. POST: filigrana invisibile + certificato (EXIF/stegano) sull'output
  → 6. LEDGER: matura la royalty alla persona reale (80/20)
```
I passi 1, 5, 6 sono **nostri e invarianti**; cambia solo il motore al passo 4.

## 5. Engine adapter (interfaccia concettuale)
Un'unica interfaccia, un adapter per motore (`lib/engines/*`):
```
interface GenerationEngine {
  id: 'higgsfield' | 'gpt-image-2' | 'nano-banana-pro'
  generate(input: {
    references: Buffer[] | string[]   // reference-set dell'avatar
    hiddenPrompt: string              // suffisso identità di sistema
    userPrompt: string                // prompt sanitizzato del compratore
    resolution, aspectRatio, ...
  }): Promise<{ imageUrl: string }>
}
```
Higgsfield resta un adapter come gli altri → nessuna rottura dell'esistente.

## 6. Schema DB (solo ADDITIVO, nullable — nessuna modifica distruttiva)
- Nuova tabella `avatar_references(avatar_id, slot, storage_path, angle, created_at)` — il set per avatar.
- Su `generations`: colonne nullable `engine` e `tier` (quale motore/tier ha prodotto il contenuto).
- Storage `references` **privato e cifrato** su Supabase Storage.

## 7. Sicurezza & privacy (non negoziabili)
- **Sanitizzazione prompt compratore**: il nostro suffisso identità e le categorie non sono sovrascrivibili.
- **Enforcement categorie di consenso**: lo fa la piattaforma prima di generare (il modello non lo fa).
- **Privacy**: i reference sono foto reali sensibili → storage **cifrato**, GDPR, purge su revoca, **mai on-chain** (solo hash, come da guardrail).

## 8. 🔴 Nodi aperti da risolvere PRIMA di costruire
1. **Policy/ToS dei provider sui volti reali.** Generare persone reali identificabili dalle
   loro foto può toccare i termini di OpenAI/Google. Il **nostro consenso documentato è un asset**
   (proviamo il permesso), ma va **verificato** che i ToS lo permettano. *Priorità #1.*
2. **Fedeltà non garantita 1:1**: validare empiricamente per avatar; eventuale "score di fedeltà".
3. **Costo/latenza**: inviare N immagini ad alta fedeltà a ogni call costa più input-token di un
   Soul (identità "cotta" dentro). Pesare sui margini (gen reale resta ben sotto i prezzi di vendita).
4. **Chiavi API: DISPONIBILI ORA** (verificato 2026-06-08).
   - **GPT Image 2** — model id `gpt-image-2`, GA per developer da inizio maggio 2026. Chiave su
     platform.openai.com. Prezzo ~$0,04–0,35 a immagine (per complessità/dimensione).
   - **Nano Banana Pro** — model id `gemini-3-pro-image-preview`. Chiave su Google AI Studio
     (aistudio.google.com → "Create API Key"); **richiede billing attivo (Tier 1+)**, il free
     tier non genera immagini. Prezzo $0,134 (1K/2K) · $0,24 (4K); batch ~$0,067/2K. Vertex AI per enterprise.

## 9. Cosa NON cambia
Tutto l'esistente (registro, consenso, royalty, filigrana, certificato, Higgsfield) resta
intatto. Questo è un **potenziamento additivo**: nuovi adapter + nuovi tier sotto lo stesso filtro.
