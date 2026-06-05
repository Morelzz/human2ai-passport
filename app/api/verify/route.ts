import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const supabase = createServerClient();

  // 1. È il TOKEN di un avatar?
  const { data: avatar } = await supabase
    .from("avatars")
    .select("handle, alias, tier, consent_start, revoked_at, token_hash")
    .eq("token_hash", token)
    .maybeSingle();

  if (avatar) {
    return NextResponse.json({
      valid: true,
      type: "avatar",
      alias: avatar.alias,
      handle: avatar.handle,
      tier: avatar.tier,
      status: avatar.revoked_at ? "REVOCATO" : "ATTIVO",
      consent_start: avatar.consent_start,
      revoked_at: avatar.revoked_at ?? null,
    });
  }

  // 2. È il CERTIFICATO di un contenuto generato?
  const { data: gen } = await supabase
    .from("generations")
    .select("created_at, category, avatars(handle, alias, tier, consent_start, revoked_at)")
    .eq("certificate", token)
    .maybeSingle();

  if (gen) {
    const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
    return NextResponse.json({
      valid: true,
      type: "content",
      alias: av?.alias ?? null,
      handle: av?.handle ?? null,
      tier: av?.tier ?? null,
      status: av?.revoked_at ? "REVOCATO" : "ATTIVO",
      consent_start: av?.consent_start ?? null,
      revoked_at: av?.revoked_at ?? null,
      generated_at: gen.created_at,
      category: gen.category ?? null,
    });
  }

  return NextResponse.json({ valid: false });
}
