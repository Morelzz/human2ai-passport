# Human2AI — Contratti on-chain (Base)

Il binario dei **diritti d'immagine** on-chain. Due contratti, una filosofia:

| Contratto | Cos'è | Trasferibile? |
|---|---|---|
| `HumanIdentity.sol` | **Identità del volto** — il "titolo di proprietà" di una persona reale verificata | ❌ **Soulbound** (ERC-5192): non si vende la propria identità |
| `HumanLicense.sol` | **Licenza d'uso** — diritto a usare un volto in una categoria | ✅ Trasferibile, con **royalty EIP-2981** (la persona è pagata a ogni rivendita) |

## Come si lega all'app

- `HumanIdentity.certHash` = il `token_hash` del registro Human2AI (la stessa identità on-chain e off-chain).
- `HumanLicense.contentCert` = il certificato del contenuto generato — **lo stesso codice della filigrana invisibile** (`lib/stegano.ts`). Così da un'immagine si risale a licenza → identità → proprietario.
- Modello **gasless / web3 invisibile**: il `owner` dei contratti è un **wallet relayer** della piattaforma che mintа per conto dell'utente (l'utente non paga gas e non vede la blockchain). In futuro: Account Abstraction + paymaster; Phantom/self-custody come export opzionale.

## Flusso previsto
1. KYC approvato → la piattaforma chiama `mintIdentity(wallet, token_hash, handle)` → identità soulbound della persona.
2. Generazione commerciale → `mintLicense(compratore, identityId, categoria, contentCert, walletPersona, royaltyBps)`.
3. L'app salva `onchain_tx` / `onchain_token_id` su Supabase (vedi `supabase/ownership.sql`) e il passport mostra "Ancorato su Base".

## Deploy (quando ci sono RPC + relayer)

Servono: un **RPC Base** (es. Alchemy/Coinbase), la **private key del relayer** (con un po' di ETH su Base per il gas), e OpenZeppelin.

### Con Foundry
```bash
forge init --force
forge install OpenZeppelin/openzeppelin-contracts
# remapping: @openzeppelin/=lib/openzeppelin-contracts/
forge create contracts/HumanIdentity.sol:HumanIdentity \
  --rpc-url $BASE_RPC --private-key $RELAYER_KEY \
  --constructor-args $RELAYER_ADDRESS "https://human2ai.example/api/nft/identity/"
forge create contracts/HumanLicense.sol:HumanLicense \
  --rpc-url $BASE_RPC --private-key $RELAYER_KEY \
  --constructor-args $RELAYER_ADDRESS "https://human2ai.example/api/nft/license/"
```

### Con Hardhat
`npm i -D hardhat @openzeppelin/contracts` poi uno script di deploy standard verso la rete `base`.

> **Reti:** testare prima su **Base Sepolia** (testnet, gas gratis dai faucet), poi **Base mainnet**.

## Note
- **MiCA-safe:** sono token di **identità/licenza** (proprietà/utilità), NON una criptovaluta fungibile di piattaforma.
- **Sicurezza:** `mint*` è `onlyOwner` (solo il relayer). Prima del mainnet: audit + gestione sicura della chiave relayer (KMS/multisig).
- **GDPR:** on-chain vanno SOLO hash anonimi (`token_hash`, certificato). MAI volti, foto o documenti.
- I contratti non fanno parte della build Next: vivono qui finché non si deploya.
