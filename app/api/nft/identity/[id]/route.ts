import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";

// Metadati dell'NFT identità (standard tipo OpenSea). Il baseURI del contratto
// HumanIdentity punta qui: GET /api/nft/identity/<tokenId> → JSON.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const admin = createServerClient();

  const { data: av } = await admin
    .from("avatars")
    .select("handle, alias, tier, consent_start, revoked_at, verification_status, protection_only")
    .eq("onchain_token_id", id)
    .maybeSingle();

  // Gate del registro pubblico (isPublicAvatar): un'identità sospesa, rifiutata o
  // in sola protezione non espone i suoi metadati NFT, neanche se ancorata
  // on-chain. Stesso 404 del "non trovato" per non rivelarne l'esistenza.
  // (Oggi dormiente: 0 avatar ancorati; va in piedi prima di accendere la chain.)
  if (!av || !isPublicAvatar(av)) {
    return Response.json(
      { name: `Semblic Identity #${id}`, description: "Identità non trovata nel registro." },
      { status: 404 }
    );
  }

  return Response.json({
    name: `Semblic Identity, @${av.handle}`,
    description:
      "Identità SOULBOUND del volto di una persona reale e consenziente. Non trasferibile: non si vende la propria identità. Le licenze d'uso sono token separati con royalty alla persona.",
    external_url: `${origin}/passport/${av.handle}`,
    image: `${origin}/logo-shield.png`,
    attributes: [
      { trait_type: "Tier", value: av.tier },
      { trait_type: "Soulbound", value: "true" },
      { trait_type: "Stato consenso", value: av.revoked_at ? "Revocato" : "Attivo" },
      { trait_type: "Registrato", value: av.consent_start },
    ],
  });
}
