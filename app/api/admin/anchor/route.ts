import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { isChainConfigured, anchorIdentity, chainName } from "@/lib/chain";

export const runtime = "nodejs";

// Ancora on-chain (Base) l'identità soulbound di un avatar. Operatore (admin).
// In futuro: automatico dopo l'approvazione KYC. Gas a carico del relayer.
async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato", status: 401 };
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Riservato agli operatori", status: 403 };
  return { ok: true as const };
}

// GET: stato della configurazione blockchain (per la UI).
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ configured: isChainConfigured(), chain: chainName() });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  if (!isChainConfigured()) {
    return NextResponse.json(
      { error: "Blockchain non ancora configurata (mancano BASE_RPC_URL / RELAYER_PRIVATE_KEY / IDENTITY_CONTRACT)" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const handle = String(body?.handle ?? "").trim();
  if (!handle) return NextResponse.json({ error: "handle mancante" }, { status: 400 });

  const admin = createServerClient();
  const { data: av } = await admin
    .from("avatars")
    .select("id, handle, alias, token_hash, owner_wallet, onchain_tx")
    .eq("handle", handle)
    .maybeSingle();
  if (!av) return NextResponse.json({ error: "Avatar non trovato" }, { status: 404 });
  if (av.onchain_tx) return NextResponse.json({ error: "Identità già ancorata", tx: av.onchain_tx }, { status: 409 });

  let res;
  try {
    res = await anchorIdentity({ certHash: av.token_hash, handle: av.handle, ownerWallet: av.owner_wallet });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore on-chain" }, { status: 502 });
  }

  const { error: upErr } = await admin
    .from("avatars")
    .update({
      chain: res.chain,
      onchain_tx: res.txHash,
      onchain_token_id: res.tokenId,
      anchored_at: new Date().toISOString(),
    })
    .eq("id", av.id);
  if (upErr) return NextResponse.json({ error: upErr.message, tx: res.txHash }, { status: 500 });

  return NextResponse.json({ ok: true, ...res });
}
