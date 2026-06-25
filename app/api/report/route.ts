import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { allowRequest, ipFrom } from "@/lib/rate-limit";

// Endpoint pubblico: chiunque (anche senza account) può segnalare un abuso.
// L'avatar viene risolto lato server da handle o da certificato del contenuto,
// così il client non può iniettare un avatar_id arbitrario.
const REASONS = ["no_consent", "impersonation", "misuse", "illegal", "other"] as const;
type Reason = (typeof REASONS)[number];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  if (!(await allowRequest(`report:${ipFrom(request)}`, 10, 600))) {
    return NextResponse.json({ error: "Troppe segnalazioni, riprova tra qualche minuto" }, { status: 429 });
  }

  const reason = body.reason as Reason;
  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "Motivo non valido" }, { status: 400 });
  }

  const handle = typeof body.handle === "string" ? body.handle.trim().replace(/^@/, "") : "";
  const certificate = typeof body.certificate === "string" ? body.certificate.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 4000) : "";
  const reporterEmail = typeof body.reporter_email === "string" ? body.reporter_email.trim().slice(0, 320) : "";

  if (!handle && !certificate) {
    return NextResponse.json({ error: "Indica l'avatar o il certificato del contenuto" }, { status: 400 });
  }

  const admin = createServerClient();

  // Risolvi l'avatar bersaglio lato server.
  let avatarId: string | null = null;
  let resolvedHandle: string | null = null;
  let targetType: "avatar" | "content" = "avatar";

  if (certificate) {
    targetType = "content";
    const { data: gen } = await admin
      .from("generations")
      .select("avatar_id, avatars(handle)")
      .eq("certificate", certificate)
      .maybeSingle();
    if (!gen) {
      return NextResponse.json({ error: "Nessun contenuto trovato per questo certificato" }, { status: 404 });
    }
    avatarId = gen.avatar_id ?? null;
    const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
    resolvedHandle = av?.handle ?? null;
  } else {
    const { data: av } = await admin
      .from("avatars")
      .select("id, handle")
      .eq("handle", handle)
      .maybeSingle();
    if (!av) {
      return NextResponse.json({ error: "Nessun avatar trovato con questo handle" }, { status: 404 });
    }
    avatarId = av.id;
    resolvedHandle = av.handle;
  }

  const { error } = await admin.from("abuse_reports").insert({
    target_type: targetType,
    avatar_id: avatarId,
    certificate: certificate || null,
    handle: resolvedHandle,
    reason,
    details: details || null,
    reporter_email: reporterEmail || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
