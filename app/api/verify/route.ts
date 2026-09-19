import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import { NextRequest, NextResponse } from "next/server";
import { origineVideo } from "@/lib/video-certificato";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const supabase = createServerClient();

  // 1. È il TOKEN di un avatar?
  const { data: avatar } = await supabase
    .from("avatars")
    .select("handle, alias, tier, consent_start, revoked_at, token_hash, verification_status, protection_only")
    .eq("token_hash", token)
    .maybeSingle();

  // Solo gli avatar PUBBLICI sono verificabili per token (isPublicAvatar, fonte
  // unica). Un volto in sola protezione (VETO) non si rivela MAI, neanche
  // conoscendone il token; un avatar non approvato non e' nel registro pubblico.
  if (avatar && isPublicAvatar(avatar)) {
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
      // Il token che ha matchato È il certificato: serve al link "Segnala
      // abuso" del client (deep-link ?token= dai feed/badge).
      certificate: token,
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

  // 3. È il certificato di un VIDEO Anima? Si verifica attraverso lo scatto di partenza.
  const video = await origineVideo(supabase, token);
  if (video) {
    const { data: src } = await supabase
      .from("generations")
      .select("category, avatars(handle, alias, tier, consent_start, revoked_at)")
      .eq("certificate", video.sourceCertificate)
      .maybeSingle();
    const av = src ? (Array.isArray(src.avatars) ? src.avatars[0] : src.avatars) : null;
    if (av) {
      return NextResponse.json({
        valid: true,
        type: "content",
        medium: "video",
        certificate: token,
        source_certificate: video.sourceCertificate,
        alias: av.alias ?? null,
        handle: av.handle ?? null,
        tier: av.tier ?? null,
        status: av.revoked_at ? "REVOCATO" : "ATTIVO",
        consent_start: av.consent_start ?? null,
        revoked_at: av.revoked_at ?? null,
        generated_at: video.created_at,
        category: src?.category ?? null,
      });
    }
  }

  return NextResponse.json({ valid: false });
}
