import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const supabase = createServerClient();
  const { data: avatar } = await supabase
    .from("avatars")
    .select("handle, alias, tier, consent_start, revoked_at, token_hash")
    .eq("token_hash", token)
    .single();

  if (!avatar) return NextResponse.json({ valid: false });

  const status = avatar.revoked_at ? "REVOCATO" : "ATTIVO";

  return NextResponse.json({
    valid: true,
    alias: avatar.alias,
    handle: avatar.handle,
    tier: avatar.tier,
    status,
    consent_start: avatar.consent_start,
    revoked_at: avatar.revoked_at ?? null,
  });
}
