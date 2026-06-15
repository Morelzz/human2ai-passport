import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { grantWelcomeVoltOnce } from "@/lib/volt";

// Coda di revisione KYC — riservata agli operatori (role 'admin').
// GET:  profili con kyc_status='pending' + URL FIRMATI temporanei (1 ora)
//       dei file nel bucket privato 'documents' (mai URL pubblici: sono
//       documenti d'identità).
// POST: { user_id, action: 'approve'|'reject' } -> aggiorna kyc_status.
// La revisione è MANUALE per scelta (fase attuale): il face-match automatico
// (AWS Rekognition / Stripe Identity) si innesterà sopra lo stesso campo.

const SIGNED_URL_TTL = 3600; // 1 ora: una review di molte persone non scade a meta'

async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato", status: 401 };
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Riservato agli operatori", status: 403 };
  return { ok: true as const };
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createServerClient();
  const { data: pending } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: true })
    .limit(100); // guardia: oltre, servira' la paginazione (follow-up)

  // Ogni candidato in PARALLELO (50 persone in serie erano lente e a rischio
  // timeout della funzione): lista file -> URL firmati + eventuale face-match.json.
  const items = await Promise.all((pending ?? []).map(async (p) => {
    // I file della candidatura vivono in documents/<user_id>/
    const { data: files } = await admin.storage.from("documents").list(p.id);
    const images = (files ?? []).filter((f) => f.name !== "face-match.json");
    const names = images.map((f) => `${p.id}/${f.name}`);
    let signed: { name: string; url: string }[] = [];
    if (names.length > 0) {
      const { data: urls } = await admin.storage.from("documents").createSignedUrls(names, SIGNED_URL_TTL);
      signed = (urls ?? [])
        .map((u, i) => ({ name: images[i]?.name ?? `file-${i}`, url: u.signedUrl }))
        .filter((x): x is { name: string; url: string } => Boolean(x.url));
    }

    // Pre-screening face-match (se la candidatura l'ha calcolato)
    let faceMatch: unknown = null;
    if ((files ?? []).some((f) => f.name === "face-match.json")) {
      const { data: blob } = await admin.storage.from("documents").download(`${p.id}/face-match.json`);
      if (blob) {
        try { faceMatch = JSON.parse(await blob.text()); } catch { /* corrotto: ignora */ }
      }
    }

    return { ...p, files: signed, face_match: faceMatch };
  }));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const userId = String(body?.user_id ?? "").trim();
  const action = body?.action;
  if (!userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createServerClient();
  const status = action === "approve" ? "approved" : "rejected";
  const { data: changed, error } = await admin
    .from("profiles")
    .update({ kyc_status: status })
    .eq("id", userId)
    .eq("kyc_status", "pending") // si decide solo ciò che è in attesa
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // 0 righe = un altro operatore l'ha già deciso (o non era pending): segnalalo,
  // invece di far credere a entrambi di aver deciso (coda condivisa).
  if (!changed || changed.length === 0) {
    return NextResponse.json({ error: "Questa verifica è già stata decisa da un altro operatore (ricarica la coda)." }, { status: 409 });
  }

  // Bonus di benvenuto: 50 VOLT alla verifica dell'account, una sola volta, e
  // SOLO se l'approvazione ha effettivamente transitato la riga (idempotente comunque).
  if (status === "approved") {
    await grantWelcomeVoltOnce(userId);
  }

  return NextResponse.json({ ok: true, status });
}
