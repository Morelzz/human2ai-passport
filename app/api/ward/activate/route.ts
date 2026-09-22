import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { buildMonitoringConsent } from "@/lib/ward/ward-consent";
import { appendAudit } from "@/lib/ward/audit";
import { scegliVoltoDaSorvegliare } from "@/lib/ward/quale-volto";

export const runtime = "nodejs";

// Attiva Ward su UN VOLTO DELL'UTENTE: inserisce il consenso di monitoraggio
// (spec F3). on_match e durata arrivano dalla schermata di consenso. Audit
// append-only.
//
// 23/9/2026: prima valeva SOLO per chi si era registrato in sola protezione.
// Ma chi ha detto si' al registro e' la persona piu' esposta di tutte: il suo
// volto gira, e fino a ieri non aveva il cane da guardia. Adesso Ward si
// accende su qualunque volto si possieda. Il motore della scansione non cambia
// di una riga: era gia' capace, era questa porta a essere chiusa.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere per attivare Ward" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const onMatch: "notify" | "auto" = body?.onMatch === "auto" ? "auto" : "notify";
  const months = body?.months === 6 ? 6 : 12;

  const admin = createServerClient();
  // Il volto da sorvegliare: prima quello in sola protezione (chi si e'
  // registrato apposta), poi quello del registro che non si e' ritirato.
  const { data: avatars } = await admin
    .from("avatars")
    .select("id, protection_only, revoked_at, usage_count")
    .eq("owner_id", user.id)
    .order("protection_only", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  const avatar = scegliVoltoDaSorvegliare(avatars ?? []);
  if (!avatar) {
    return NextResponse.json(
      { error: "Serve prima un volto tuo: registralo nel registro o in sola protezione." },
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

  await appendAudit({ actor: user.id, action: "ward.activate", target: avatar.id as string, meta: { onMatch, months, protetto: Boolean(avatar.protection_only) } });
  return NextResponse.json({ ok: true, avatarId: avatar.id });
}
