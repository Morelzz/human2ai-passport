import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { isSafeRemoteImageUrl, fetchImageSafely } from "@/lib/ward/preview-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const FETCH_TIMEOUT_MS = 8000;

// GET /api/ward/preview/[matchId]
// Anteprima DAL VIVO dell'immagine di un match Ward: si scarica al volo dalla
// fonte e si rilancia, NIENTE salvato (coerente con A2.3 data-minimization e il
// mandato caveau). Sicurezza: solo il proprietario dell'avatar (ownership), mai i
// 'minor' (child-safety), SSRF-guard sull'URL (vedi lib/ward/preview-guard).
export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const admin = createServerClient();
  const { data: m } = await admin
    .from("scan_matches")
    .select("source_url, sensitivity, avatar_id, scan_job_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!m) return new NextResponse(null, { status: 404 });

  // Ownership: o l'utente possiede l'avatar (person-scan), o e' il buyer della
  // generazione da cui nasce il match (content-scan Ward v2). Senza nessuno dei
  // due -> 404 (non riveliamo nulla).
  const { data: av } = await admin
    .from("avatars")
    .select("owner_id")
    .eq("id", m.avatar_id as string)
    .maybeSingle();
  let owns = !!av && av.owner_id === user.id;
  if (!owns && m.scan_job_id) {
    const { data: job } = await admin.from("scan_jobs").select("generation_id").eq("id", m.scan_job_id as string).maybeSingle();
    if (job?.generation_id) {
      const { data: gen } = await admin.from("generations").select("buyer_id").eq("id", job.generation_id as string).maybeSingle();
      owns = gen?.buyer_id === user.id;
    }
  }
  if (!owns) return new NextResponse(null, { status: 404 });

  // Child-safety: l'anteprima di un 'minor' non si serve MAI.
  if (m.sensitivity === "minor") return new NextResponse(null, { status: 403 });

  const url = m.source_url as string;
  if (!isSafeRemoteImageUrl(url)) return new NextResponse(null, { status: 422 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImageSafely(url, { signal: ctrl.signal });
    if (!res.ok) return new NextResponse(null, { status: 502 });
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return new NextResponse(null, { status: 415 });
    const declared = Number(res.headers.get("content-length") || "0");
    if (declared && declared > MAX_BYTES) return new NextResponse(null, { status: 413 });
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return new NextResponse(null, { status: 413 });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "content-type": ct,
        "cache-control": "private, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
