import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { getPublicAvatars } from "@/lib/registry";
import { isValidDescriptor, loadFaceIndex, saveFaceIndex } from "@/lib/face-index";

// Indice volti del registro — riservato agli operatori (role 'admin').
// GET:  avatar pubblici + URL delle foto sorgente (ritratto pubblico se
//       fotografico + reference PRIVATE via URL firmati 10 min) + stato indice.
// POST: { entries: [{handle, source, descriptor}] } -> salva l'indice.
// I descrittori si calcolano nel BROWSER dell'operatore (face-api, modelli
// già in /models): il server non fa mai girare reti neurali.

const SIGNED_URL_TTL = 600; // secondi
const MAX_ENTRIES = 500; // backstop: ~15 avatar × 9 foto oggi

async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato", status: 401 };
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Riservato agli operatori", status: 403 };
  return { ok: true as const };
}

// I ritratti del seed sono forme dicebear (SVG, nessun volto): inutile
// passarli al detector. Si indicizzano solo sorgenti fotografiche.
function isPhotoUrl(url: string | null): url is string {
  if (!url) return false;
  return !/\.svg(\?|$)/i.test(url) && !/dicebear\.com/i.test(url);
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createServerClient();
  const avatars = await getPublicAvatars(admin);

  const items = [];
  for (const a of avatars) {
    const sources: { name: string; url: string }[] = [];
    if (isPhotoUrl(a.portrait_url)) sources.push({ name: "ritratto", url: a.portrait_url });

    // Reference private (bucket "references"): URL firmati temporanei.
    const { data: files } = await admin.storage.from("references").list(a.handle);
    const images = (files ?? []).filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
    if (images.length > 0) {
      const names = images.map((f) => `${a.handle}/${f.name}`);
      const { data: urls } = await admin.storage.from("references").createSignedUrls(names, SIGNED_URL_TTL);
      for (let i = 0; i < (urls ?? []).length; i++) {
        const u = urls![i];
        if (u?.signedUrl) sources.push({ name: images[i]?.name ?? `ref-${i}`, url: u.signedUrl });
      }
    }

    items.push({
      handle: a.handle,
      alias: a.alias,
      revoked: Boolean(a.revoked_at),
      sources,
    });
  }

  // Stato dell'indice corrente (per la pagina admin).
  const index = await loadFaceIndex();
  const perHandle: Record<string, number> = {};
  for (const e of index?.entries ?? []) perHandle[e.handle] = (perHandle[e.handle] ?? 0) + 1;

  return NextResponse.json({
    avatars: items,
    index: index ? { built_at: index.built_at, total: index.entries.length, per_handle: perHandle } : null,
  });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const raw = Array.isArray(body?.entries) ? body.entries : null;
  if (!raw) return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  if (raw.length > MAX_ENTRIES) return NextResponse.json({ error: "Troppe voci" }, { status: 400 });

  // Si accettano solo handle del registro pubblico (l'indice non deve mai
  // contenere volti fuori dal registro).
  const admin = createServerClient();
  const valid = new Set((await getPublicAvatars(admin)).map((a) => a.handle));

  const entries = [];
  for (const e of raw) {
    const handle = String(e?.handle ?? "").trim();
    const source = String(e?.source ?? "").slice(0, 120);
    if (!valid.has(handle) || !isValidDescriptor(e?.descriptor)) continue;
    entries.push({ handle, source, descriptor: e.descriptor as number[] });
  }

  await saveFaceIndex({ built_at: new Date().toISOString(), entries });
  return NextResponse.json({ ok: true, saved: entries.length });
}
