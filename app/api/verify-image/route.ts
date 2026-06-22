import { createServerClient } from "@/lib/supabase";
import { extractStego } from "@/lib/stegano";
import { galleryFromRow } from "@/lib/sample-galleries";
import { NextResponse } from "next/server";
import { allowRequest, ipFrom } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Verifica "filtro": data un'immagine, estrae la filigrana invisibile (certificato
// nascosto nei pixel) e conferma se è un contenuto Semblic, di chi, e lo stato consenso.
export async function POST(req: Request) {
  // Risolve il CERTIFICATO da una di tre sorgenti, in ordine:
  //  - multipart/form-data { image }: il SERVER legge i pixel (sharp). Path dei
  //    PNG piccoli (≤4,4MB, sotto il cap ~4,5MB oltre cui Vercel risponde 413).
  //  - JSON { certificate }: il client AFFERMA di aver letto la filigrana SUL
  //    DISPOSITIVO (PNG grandi, non ricevibili dal server) e manda solo il codice.
  //    Il server NON ha visto i pixel: di questo path non può garantire "marked".
  //  - JSON { image: dataURL }: retrocompatibilità (il server legge i pixel).
  // serverExtracted = la filigrana l'ha estratta IL SERVER (prova di marcatura).
  // Rate-limit per IP: estrazione stego (sharp) costosa, evitiamo abuso anonimo.
  if (!(await allowRequest(`verify-image:${ipFrom(req)}`, 15, 60))) {
    return NextResponse.json({ valid: false, error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }
  let cert: string | null = null;
  let serverExtracted = false;
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("image");
    if (!(file instanceof File)) return NextResponse.json({ valid: false, error: "Nessuna immagine" }, { status: 400 });
    cert = await extractStego(Buffer.from(await file.arrayBuffer()));
    serverExtracted = true;
  } else {
    const body = await req.json().catch(() => null);
    const certIn = typeof body?.certificate === "string" ? body.certificate.trim() : "";
    if (certIn) {
      cert = certIn; // asserito dal client, non estratto qui
    } else {
      const image = typeof body?.image === "string" ? body.image : "";
      if (!image) return NextResponse.json({ valid: false, error: "Nessuna immagine" }, { status: 400 });
      const b64 = image.includes(",") ? image.split(",")[1] : image;
      let buf: Buffer;
      try { buf = Buffer.from(b64, "base64"); } catch { return NextResponse.json({ valid: false, marked: false }); }
      if (!buf.length) return NextResponse.json({ valid: false, marked: false });
      cert = await extractStego(buf);
      serverExtracted = true;
    }
  }

  if (!cert) return NextResponse.json({ valid: false, marked: false });

  const supabase = createServerClient();
  const { data: gen } = await supabase
    .from("generations")
    .select("created_at, category, certificate, avatars(id, handle, alias, tier, consent_start, revoked_at, commercial_consent, protection_only)")
    .eq("certificate", cert)
    .maybeSingle();

  if (!gen) {
    // Cert non nel registro. "marked" SOLO se a leggere la filigrana è stato il
    // server (multipart/dataURL): sul path JSON il client lo afferma, noi no.
    return NextResponse.json({ valid: false, marked: serverExtracted, certificate: cert });
  }

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;

  // VETO (guardrail non negoziabile): un volto in SOLA PROTEZIONE non si rivela
  // MAI, su nessuna superficie. Un protetto non ha generazioni (la gen è bloccata
  // a monte), quindi è una rete di sicurezza: se mai un cert puntasse a un
  // protetto, restituiamo "marcato ma identità non divulgabile", senza dati.
  if (av?.protection_only) {
    return NextResponse.json({ valid: false, marked: serverExtracted, certificate: cert });
  }

  // Catena del consenso: la timeline degli eventi rende il verdetto un atto
  // ("ecco cosa questa persona ha autorizzato e quando"), non un sì/no.
  // Best-effort: senza eventi la card usa consent_start/revoked_at.
  let events: Array<{ event_type: string; detail: string | null; occurred_at: string }> = [];
  if (av?.id) {
    const { data: ev } = await supabase
      .from("consent_events")
      .select("event_type, detail, occurred_at")
      .eq("avatar_id", av.id)
      .order("occurred_at", { ascending: false })
      .limit(20);
    // I 20 più RECENTI (una revoca di ieri non deve mai sparire per
    // troncamento), ri-ordinati in cronologia ascendente per la card.
    events = (ev ?? []).reverse();
  }

  return NextResponse.json({
    valid: true,
    marked: true,
    type: "content",
    certificate: gen.certificate,
    alias: av?.alias ?? null,
    handle: av?.handle ?? null,
    tier: av?.tier ?? null,
    status: av?.revoked_at ? "REVOCATO" : "ATTIVO",
    consent_start: av?.consent_start ?? null,
    revoked_at: av?.revoked_at ?? null,
    generated_at: gen.created_at,
    category: gen.category ?? null,
    // Modello senza categorie: per il check "la persona consente ancora l'uso
    // commerciale" e la correlazione visiva col ritratto pubblico dell'avatar.
    commercial_consent: av?.commercial_consent ?? null,
    // NB: gallery_urls vive nella migrazione avatar_public_profile (non ancora
    // applicata): galleryFromRow usa la mappa fallback per handle.
    has_portrait: av?.handle ? galleryFromRow(av.handle, undefined).length > 0 : false,
    events,
  });
}
