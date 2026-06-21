import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { buildMonitoringConsent } from "@/lib/ward/ward-consent";
import { appendAudit } from "@/lib/ward/audit";

export const runtime = "nodejs";

// Attiva Ward su un avatar PROTETTO dell'utente: inserisce il consenso di
// monitoraggio (spec F3). Richiede che esista gia' l'avatar protection_only (la
// protezione si registra prima, nel passo foto del flusso protetto). on_match e
// durata arrivano dalla schermata di consenso. Audit append-only.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere per attivare Ward" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const onMatch: "notify" | "auto" = body?.onMatch === "auto" ? "auto" : "notify";
  const months = body?.months === 6 ? 6 : 12;

  const admin = createServerClient();
  const { data: avatars } = await admin
    .from("avatars")
    .select("id, protection_only")
    .eq("owner_id", user.id)
    .order("protection_only", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  const avatar = avatars?.[0];
  if (!avatar || !avatar.protection_only) {
    return NextResponse.json(
      { error: "Serve prima un'identita protetta: completa le foto del volto." },
      { status: 409 },
    );
  }

  const row = buildMonitoringConsent({
    avatarId: avatar.id as string,
    onMatch,
    months,
    nowIso: new Date().toISOString(),
  });
  const { error } = await admin.from("monitoring_consents").insert(row);
  if (error) return NextResponse.json({ error: `Attivazione non riuscita: ${error.message}` }, { status: 500 });

  await appendAudit({ actor: user.id, action: "ward.activate", target: avatar.id as string, meta: { onMatch, months } });
  return NextResponse.json({ ok: true });
}
