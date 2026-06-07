# Human2AI — GO-LIVE (sequenza esatta per accendere tutto)

> Ordine consigliato. Ogni fase è indipendente: puoi fermarti dopo la 2 (sito
> online) e fare il resto quando vuoi. Le caselle `[ ]` sono la tua checklist.

---

## FASE 0 — Prerequisiti (una volta)
- [ ] Account: **GitHub** (per il repo), **Supabase**, **Vercel**.
- [ ] Repo su GitHub: dal progetto, `git remote add origin <url>` poi `git push -u origin master`.

---

## FASE 1 — Supabase (database pronto)
Apri il progetto Supabase → **SQL Editor** → incolla e lancia il contenuto dei file.

**Se è il DB che usi già** (mancano solo queste):
- [ ] `supabase/abuse_reports.sql`
- [ ] `supabase/ownership.sql`
- [ ] Check ruolo enterprise (incolla e lancia):
  ```sql
  alter table profiles drop constraint if exists profiles_role_check;
  alter table profiles add constraint profiles_role_check check (role in ('buyer','seller','admin','enterprise'));
  ```

**Se parti da un DB NUOVO**, applica in quest'ordine:
`schema.sql` → `auth_schema.sql` → `generations.sql` → `seller_avatars.sql` → `royalty_restructure.sql` → `identity_kit_backfill.sql` → `higgsfield_bridge.sql` → `consent_link.sql` → `enterprise.sql` → `abuse_reports.sql` → `ownership.sql` → (opzionale demo) `seed.sql` → `seed_extra.sql`.

- [ ] Storage: crea un bucket `documents` (privato) per i futuri documenti KYC.

---

## FASE 2 — Vercel (sito online) ⭐ il vero "go-live"
1. [ ] Vercel → **Add New Project** → importa il repo GitHub.
2. [ ] Framework: Next.js (auto). Build command e output: default.
3. [ ] **Environment Variables** → incolla (valori reali, vedi `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  ← *solo server, segreto*
   - `HIGGSFIELD_API_KEY`, `HIGGSFIELD_API_SECRET` (+ `HIGGSFIELD_MODE` se serve)
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` = l'URL Vercel (poi il dominio reale)
4. [ ] **Deploy**. A fine build avrai un URL `*.vercel.app`.
5. [ ] (Dominio) Vercel → **Domains** → aggiungi il tuo dominio, aggiorna i DNS, poi cambia `NEXT_PUBLIC_SITE_URL` col dominio e ri-deploya.
6. [ ] **Legal**: fai rivedere a un legale `/privacy` e `/termini` (oggi sono bozze).

> ✅ Dopo la Fase 2 il sito è VIVO con tutto ciò che non richiede infra extra
> (registro, verifica, filigrana invisibile, atto di proprietà off-chain).

---

## FASE 3 — Blockchain / Base (accende proprietà on-chain)
Serve: un **RPC Base**, un **wallet relayer** con un po' di ETH su Base, e **Foundry**.

1. [ ] Installa Foundry: `curl -L https://foundry.paradigm.xyz | bash` → `foundryup`.
2. [ ] Nel repo: `forge init --force` poi `forge install OpenZeppelin/openzeppelin-contracts`
   - remapping: crea `remappings.txt` con `@openzeppelin/=lib/openzeppelin-contracts/`
3. [ ] Crea un wallet **relayer** (solo per la piattaforma). Mettici un po' di ETH:
   - **Testnet (consigliato per primo)**: rete **Base Sepolia**, ETH gratis dai faucet.
   - **Mainnet**: rete **Base**, ETH vero (bastano pochi € — il gas è bassissimo).
4. [ ] RPC: prendi un endpoint Base (Alchemy o Coinbase Developer Platform, anche free).
5. [ ] Deploy dei contratti (sostituisci le variabili):
   ```bash
   forge create contracts/HumanIdentity.sol:HumanIdentity \
     --rpc-url $BASE_RPC --private-key $RELAYER_KEY \
     --constructor-args $RELAYER_ADDRESS "$SITE_URL/api/nft/identity/"
   forge create contracts/HumanLicense.sol:HumanLicense \
     --rpc-url $BASE_RPC --private-key $RELAYER_KEY \
     --constructor-args $RELAYER_ADDRESS "$SITE_URL/api/nft/license/"
   ```
   Annota i **due indirizzi** stampati.
6. [ ] Su Vercel aggiungi le env e ri-deploya:
   - `CHAIN` = `base-sepolia` (test) o `base` (mainnet)
   - `BASE_RPC_URL`, `RELAYER_PRIVATE_KEY`
   - `IDENTITY_CONTRACT`, `LICENSE_CONTRACT` (gli indirizzi sopra)
7. [ ] Test: come **admin**, chiama `POST /api/admin/anchor` con `{ "handle": "mario-r" }`.
   Sul passport apparirà **"Ancorato su Base"** con il link alla transazione.

> Quando questo funziona, dimmelo: aggiungo (rapidi) bottone "Ancora" nell'admin,
> auto-anchor dopo il KYC, mint della licenza in `/api/generate`, e "Collega Phantom".

---

## FASE 4 — KYC reale (verifica documento ↔ selfie ↔ foto)
Decisione provider: **AWS Rekognition** (face-match, economico) oppure **Onfido / Stripe Identity** (KYC chiavi-in-mano).
- [ ] Apri l'account provider, prendi le chiavi.
- [ ] Dimmi quale: **integro io** il flusso (upload documento + selfie/liveness, confronto, gate "approvato", storage cifrato con purge). Oggi il KYC è simulato.

---

## FASE 5 — Pagamenti (Stripe)
- [ ] Crea account **Stripe**, prendi le chiavi (test poi live).
- [ ] Decidi: abbonamento all'iscrizione e/o pagamento a generazione.
- [ ] **Integro io**: Stripe Checkout (compratore) + Stripe Connect (payout ai creatori). Oggi il wallet/royalty è simulato.

---

## In una frase
**Fase 1 + 2 = sei online oggi.** Fase 3 accende la proprietà on-chain. Fasi 4–5
trasformano KYC e pagamenti da simulati a reali (lì serve che io scriva il codice
d'integrazione, appena hai le chiavi).
