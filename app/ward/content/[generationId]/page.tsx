import { redirect, notFound } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { ContentFinder, type FinderMatch } from "../../ContentFinder";
import type { AllowEntry } from "@/lib/ward/whitelist";

export const dynamic = "force-dynamic";

// Area privata del buyer: fuori dall'indice (il layout /ward ora e' pubblico).
export const metadata = {
  robots: { index: false, follow: false },
};

// /ward/content/[generationId] — Ward v2 finder per UNA generazione. Server:
// auth + ownership (l'utente e' il buyer) + carica l'ultimo scan content e i suoi
// match (gia' senza i whitelisted, esclusi a scan-time) + le voci di whitelist.
export default async function ContentFinderPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect(`/login?next=/ward/content/${generationId}`);

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("id, buyer_id, avatar_id, image_url")
    .eq("id", generationId)
    .maybeSingle();
  if (!gen || gen.buyer_id !== user.id) notFound();

  const { data: av } = await admin.from("avatars").select("alias").eq("id", gen.avatar_id).maybeSingle();

  // Ultimo job content per questa generazione.
  const { data: job } = await admin
    .from("scan_jobs")
    .select("id, created_at")
    .eq("generation_id", generationId)
    .eq("kind", "content")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let matches: FinderMatch[] = [];
  if (job?.id) {
    const { data } = await admin
      .from("scan_matches")
      .select("id, source_url, page_url, host, band, reputation, watermark_present, certificate, created_at")
      .eq("scan_job_id", job.id)
      .order("created_at");
    matches = (data ?? []).map((m) => ({
      id: m.id as string,
      sourceUrl: m.source_url as string,
      pageUrl: (m.page_url as string | null) ?? null,
      host: (m.host as string | null) ?? null,
      band: (m.band as "confirmed" | "review") ?? "review",
      reputation: (m.reputation as "exposed" | "obscure" | null) ?? null,
      watermarkPresent: (m.watermark_present as boolean | null) ?? null,
      certificate: (m.certificate as string | null) ?? null,
    }));
  }

  const { data: allowRows } = await admin
    .from("allowlist")
    .select("entry_type, host, value")
    .eq("generation_id", generationId);
  const allow: AllowEntry[] = (allowRows ?? []).map((a) => ({
    type: (a.entry_type as "host" | "url") ?? "host",
    value: a.entry_type === "url" ? ((a.value as string | null) ?? (a.host as string)) : (a.host as string),
  }));

  return (
    <ContentFinder
      generationId={generationId}
      alias={(av?.alias as string | undefined) ?? "La tua immagine"}
      imageUrl={(gen.image_url as string | null) ?? null}
      lastScanAt={(job?.created_at as string | null) ?? null}
      matches={matches}
      allow={allow}
    />
  );
}
