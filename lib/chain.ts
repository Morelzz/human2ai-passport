import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

// ──────────────────────────────────────────────────────────────────────────
// Ponte on-chain (Base) — modello "web3 invisibile": la piattaforma firma con
// un wallet RELAYER e paga il gas per l'utente. Tutto opzionale: finché le env
// non sono impostate, `isChainConfigured()` è false e le API rispondono "non
// ancora attivo" invece di rompersi.
//
// Env richieste (vedi .env.example):
//   CHAIN=base | base-sepolia      (default: base-sepolia)
//   BASE_RPC_URL=...
//   RELAYER_PRIVATE_KEY=0x...      (wallet piattaforma con ETH su Base per il gas)
//   IDENTITY_CONTRACT=0x...        (HumanIdentity deployato)
//   LICENSE_CONTRACT=0x...         (HumanLicense deployato)
// ──────────────────────────────────────────────────────────────────────────

const RPC = process.env.BASE_RPC_URL ?? "";
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY ?? "";
const IDENTITY_CONTRACT = (process.env.IDENTITY_CONTRACT ?? "") as Hex;
const LICENSE_CONTRACT = (process.env.LICENSE_CONTRACT ?? "") as Hex;
const CHAIN = process.env.CHAIN === "base" ? base : baseSepolia;

export function isChainConfigured(): boolean {
  return Boolean(RPC && RELAYER_KEY && IDENTITY_CONTRACT);
}

export function chainName(): string {
  return CHAIN.name;
}

// ABI minimale: solo ciò che chiamiamo.
const IDENTITY_ABI = [
  {
    type: "function",
    name: "mintIdentity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "cert", type: "bytes32" },
      { name: "handle_", type: "string" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
] as const;

const LICENSE_ABI = [
  {
    type: "function",
    name: "mintLicense",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "identityTokenId", type: "uint256" },
      { name: "category", type: "string" },
      { name: "contentCertHash", type: "bytes32" },
      { name: "royaltyReceiver", type: "address" },
      { name: "royaltyBps", type: "uint96" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
] as const;

// token_hash (64 hex) → bytes32. Accetta anche con/ senza prefisso 0x.
function toBytes32(hexDigest: string): Hex {
  const clean = hexDigest.startsWith("0x") ? hexDigest.slice(2) : hexDigest;
  return `0x${clean.padEnd(64, "0").slice(0, 64)}` as Hex;
}

function clients() {
  const account = privateKeyToAccount(RELAYER_KEY as Hex);
  const transport = http(RPC);
  const publicClient = createPublicClient({ chain: CHAIN, transport });
  const walletClient = createWalletClient({ account, chain: CHAIN, transport });
  return { account, publicClient, walletClient };
}

export interface AnchorResult {
  txHash: string;
  tokenId: string;
  chain: string;
  to: string;
}

// Ancora l'identità soulbound di un avatar. `to` = wallet della persona (se
// collegato) altrimenti il relayer come custode. Ritorna tx + tokenId.
export async function anchorIdentity(params: {
  certHash: string;
  handle: string;
  ownerWallet?: string | null;
}): Promise<AnchorResult> {
  if (!isChainConfigured()) throw new Error("Blockchain non configurata");
  const { account, publicClient, walletClient } = clients();
  const to = (params.ownerWallet || account.address) as Hex;

  const { request, result } = await publicClient.simulateContract({
    address: IDENTITY_CONTRACT,
    abi: IDENTITY_ABI,
    functionName: "mintIdentity",
    args: [to, toBytes32(params.certHash), params.handle],
    account,
  });
  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash, tokenId: String(result), chain: CHAIN.name, to };
}

// Emette una licenza d'uso on-chain con royalty alla persona.
export async function mintLicenseOnchain(params: {
  to: string;
  identityTokenId: string | number;
  category: string;
  contentCert: string;
  royaltyReceiver: string;
  royaltyBps: number;
}): Promise<AnchorResult> {
  if (!isChainConfigured() || !LICENSE_CONTRACT) throw new Error("Contratto licenze non configurato");
  const { account, publicClient, walletClient } = clients();

  const { request, result } = await publicClient.simulateContract({
    address: LICENSE_CONTRACT,
    abi: LICENSE_ABI,
    functionName: "mintLicense",
    args: [
      params.to as Hex,
      BigInt(params.identityTokenId),
      params.category,
      toBytes32(params.contentCert),
      params.royaltyReceiver as Hex,
      BigInt(params.royaltyBps),
    ],
    account,
  });
  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash, tokenId: String(result), chain: CHAIN.name, to: params.to };
}
