import { notFound, permanentRedirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import { Avatar, ConsentEvent, TIER_CONFIG, IDENTITY_KIT } from "@/lib/types";
import { truncateToken } from "@/lib/token";
import { galleryFromRow } from "@/lib/sample-galleries";
import { siteUrl } from "@/lib/site";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import PassportClient from "./PassportClient";
import { jsonLdSicuro } from "@/lib/json-ld";

// Handle storici rinominati: redirect permanente (308) al nuovo handle, per i
// vecchi link gia' indicizzati. (0.4 naming: 'mario-r' e' diventato 'random'.)
const OLD_HANDLE_REDIRECTS: Record<string, string> = { "mario-r": "random" };

interface Props {
  params: Promise<{ handle: string }>;
}

// Review C5 — metadata per-passport: titolo/descrizione propri; l'og:image
// arriva da opengraph-image.tsx (convenzione Next, agganciata in automatico).
export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const sb = createServerClient();
  const { data: a } = await sb
    .from("avatars")
    .select("alias, revoked_at, verification_status, protection_only")
    .eq("handle", handle)
    .single();
  if (!a || !isPublicAvatar(a)) return { title: "Passaporto del volto" };
  const title = `${a.alias} · Passaporto del volto`;
  const description = a.revoked_at
    ? `${a.alias} ha revocato il consenso: questo volto non è più generabile. La revoca è la prova che il sistema obbedisce.`
    : `${a.alias} è una persona reale, verificata e consenziente del registro Semblic. Ogni utilizzo del suo volto è autorizzato, tracciato e pagato.`;
  // openGraph/twitter espliciti: senza, resterebbero quelli globali del layout
  // (l'og:image invece arriva dalla convenzione e vince comunque).
  return {
    title,
    description,
    // Canonical: la pagina accetta query (condivisioni), meglio un URL unico.
    alternates: { canonical: `/passport/${handle}` },
    openGraph: { title, description, type: "profile", siteName: "Semblic", locale: "it_IT" },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl()}/passport/${handle}/opengraph-image`],
    },
  };
}

const CAMPI_PUBBLICI = [
  "id", "handle", "alias", "real_name", "instagram", "facebook", "tier", "portrait_url",
  "consent_start", "revoked_at", "commercial_consent", "video_consent", "usage_count",
  "royalty_accrued_cents", "token_hash", "verification_status", "protection_only", "is_demo",
  ...Object.keys(IDENTITY_KIT),
] as const;

function soloPubblico(riga: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CAMPI_PUBBLICI) if (k in riga) out[k] = riga[k];
  return out;
}

export default async function PassportPage({ params }: Props) {
  const { handle } = await params;
  const supabase = createServerClient();

  const { data: avatar, error } = await supabase
    .from("avatars")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error || !avatar) {
    const renamed = OLD_HANDLE_REDIRECTS[handle];
    if (renamed) permanentRedirect(`/passport/${renamed}`);
    notFound();
  }
  // Gate: i passport non approvati non sono pubblici; e i volti in SOLA
  // PROTEZIONE (VETO) non compaiono mai su una superficie pubblica (isPublicAvatar).
  if (!isPublicAvatar(avatar)) notFound();

  // Cronologia e verifica del titolare partono insieme (27/9/2026): una dopo
  // l'altra costavano 230 ms, insieme meno di 100.
  const [{ data: events }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from("consent_events")
      .select("id, avatar_id, event_type, occurred_at")
      .eq("avatar_id", avatar.id)
      .order("occurred_at", { ascending: true }),
    avatar.owner_id
      ? supabase.from("profiles").select("kyc_status").eq("id", avatar.owner_id).single()
      : Promise.resolve({ data: null as { kyc_status: string | null } | null }),
  ]);

  // PAGINA PUBBLICA (27/9/2026): la cronologia mostra solo il tipo di evento e
  // la data. Le note restano interne: dicevano chi dello staff aveva raccolto un
  // si' a voce, e dal 23/9 conterrebbero il testo delle regole che la persona
  // ha scritto, che non si pubblica mai.
  const consentEvents: ConsentEvent[] = (events ?? []).map((e) => ({ ...(e as Omit<ConsentEvent, "detail">), detail: null }));
  // Al browser vanno solo i campi che la pagina mostra: mai proprietario,
  // wallet, organizzazione, riferimenti del motore o le regole scritte.
  const av = soloPubblico(avatar) as unknown as Avatar;

  // Creatore verificato? (avatar con proprietario il cui KYC è approvato)
  const ownerVerified = ownerProfile?.kyc_status === "approved";

  const status = av.revoked_at ? "REVOCATO" : "ATTIVO";
  const tier = TIER_CONFIG[av.tier];
  const tokenShort = truncateToken(av.token_hash);

  // Atto di proprietà: il token unico è il titolo. I campi on-chain (Base) sono
  // opzionali finché non si applica ownership.sql / non si ancora la prima volta.
  const a = avatar as Record<string, unknown>;
  // Badge del passport: personaggio pubblico (notorietà) e volto reale (non demo).
  // is_public_figure resta dormiente per il pricing (in attesa del parere legale):
  // qui lo usiamo SOLO come badge display.
  const isPublicFigure = (a.is_public_figure as boolean) ?? false;
  // Provenienza della scansione (badge): 'studio' (centro di conversione Semblic)
  // oppure 'self' (auto-scansione da remoto). Default 'studio' finche' il campo
  // non esiste: gli avatar attuali sono tutti scansioni di studio.
  const scanSource = (a.scan_source as string) ?? "studio";
  const ownership = {
    owner: av.alias,
    ownerVerified,
    tokenShort,
    issued: av.consent_start,
    soulbound: (a.soulbound as boolean) ?? true,
    chain: (a.chain as string) ?? null,
    tx: (a.onchain_tx as string) ?? null,
    anchoredAt: (a.anchored_at as string) ?? null,
    ownerWallet: (a.owner_wallet as string) ?? null,
  };

  // Schema Person per i motori: alias pubblico, ritratto e legame con
  // l'Organization. Solo dati gia' pubblici sulla pagina, mai dati personali.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: av.alias,
    url: `${siteUrl()}/passport/${handle}`,
    ...(av.portrait_url ? { image: av.portrait_url } : {}),
    memberOf: { "@id": `${siteUrl()}/#org` },
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSicuro(personJsonLd) }} />
<div className="relative z-[2]">
        <SiteNav />
        <PassportClient
          avatar={av}
          events={consentEvents}
          status={status}
          tier={tier}
          tokenShort={tokenShort}
          isPublicFigure={isPublicFigure}
          scanSource={scanSource}
          availableForBooking={(a.available_for_booking as boolean) ?? false}
          galleryCount={galleryFromRow(handle, (avatar as Record<string, unknown>).gallery_urls).length}
          ownership={ownership}
        />
        <Footer />
      </div>
    </div>
  );
}
