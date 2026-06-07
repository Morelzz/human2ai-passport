# Human2AI — STATO & COME RIPRENDERE

> Checkpoint per continuare in QUALSIASI momento, anche in una chat nuova.
> Ultimo aggiornamento: 2026-06-08.

## ▶️ Come riprendere in una chat nuova
Apri una nuova conversazione e scrivi:
> "Riprendi il progetto Human2AI: leggi la memoria e `docs/ROADMAP.md` + `docs/STATO.md`, poi dimmi da dove ripartiamo."

Io ho la **memoria persistente** (sopravvive tra le chat) + tutto il codice è su **git** (ogni passo è un commit). Non si perde nulla.

## ⭐ La visione (stella polare)
Human2AI **non è un generatore**: è il **registro dei diritti d'immagine** — la "SIAE dei volti", il **filtro obbligatorio sopra ogni IA generativa**. Persone reali caricano il proprio volto → verifica KYC → proprietà + consenso + pagamento + prova.

## ✅ Cosa è FATTO (codice nel repo, build verde)
- **UI cinematografica** su tutto il sito (Tailwind + shadcn + Framer), logo-scudo, hamburger mobile.
- **Registro, passport, verifica token, consenso (timeline + revoca), royalty/wallet, generazione (Higgsfield), enterprise/agenzie, takedown/abuso.**
- **Filigrana INVISIBILE** (steganografia): codice nascosto nei pixel + `/verify` "carica un'immagine" per smascherare l'origine. (`lib/stegano.ts`)
- **Proprietà**: card "Atto di proprietà" sul passport (token unico = titolo, soulbound).
- **Contratti on-chain pronti**: `contracts/HumanIdentity.sol` (soulbound ERC-5192) + `HumanLicense.sol` (royalty EIP-2981).
- **Scaffold mint app-side**: `lib/chain.ts` (viem/Base) + `/api/admin/anchor` (disattivi finché mancano le env, nessun crash).
- **Deploy-prep**: `next build` verde, metadati OG/SEO, `.env.example`, pagine `/privacy` e `/termini`.

## 🔌 Cosa MANCA (solo infrastrutture esterne — servono i tuoi account)
1. **Supabase** — applicare le migrazioni: `abuse_reports.sql`, `ownership.sql`, e il check ruolo `enterprise` (in `enterprise.sql`).
2. **Vercel** — collegare il repo, impostare le env (vedi `.env.example`), deploy + dominio (`NEXT_PUBLIC_SITE_URL`).
3. **Blockchain (Base)** — deploy dei 2 contratti (prima Base Sepolia testnet), poi incollare i 5 valori env (RPC, relayer key, indirizzi).
4. **KYC reale** — provider (AWS Rekognition / Onfido) per il match documento↔selfie↔foto.
5. **Pagamenti** — Stripe (checkout/abbonamento + payout).

## 🧭 Ordine consigliato (workflow)
UI ✅ → **Deploy (Vercel + migrazioni)** → KYC reale → Pagamenti → **Blockchain (accendere i contratti)**.
La filigrana invisibile e la proprietà soulbound sono già pronte: si "accendono" col deploy + Base.

## 🔑 Decisioni chiave prese
- Blockchain: **Base** (L2 EVM), wallet **invisibili/gasless** (relayer paga il gas), **identità soulbound** (non vendibile) + **licenze trasferibili con royalty EIP-2981**. **Phantom = export opzionale**, non l'ingresso. **No** criptovaluta di piattaforma (MiCA).
- Royalty in **EUR via Stripe** (la blockchain è per *proprietà e prova*, non per i pagamenti).
- GDPR: on-chain **solo hash anonimi**, mai volti/foto/documenti.

## 🧪 Account di test (Supabase demo)
`admin@h2ai.test` (admin) · `org@h2ai.test` (agenzia) — password `Test1234!`. Avatar reale: `mario-r`.

## ▶️ Avvio locale
`npm run dev` → http://localhost:3000 (e http://<ip-locale>:3000 da telefono). Va riavviato a ogni riapertura del PC.
