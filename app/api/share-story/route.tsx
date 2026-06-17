import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import { truncateToken } from "@/lib/token";
import { siteUrl } from "@/lib/site";

// Share Story — cornice-certificato 1080×1920 per la condivisione su Instagram.
// Riferimento visivo: design/mockup_share_story.html (scala ×4 dal mockup 270px).
// La cornice È il render: l'immagine condivisa porta sempre QR + certificato,
// non è un overlay rimovibile. MAI importi in euro: solo il contatore di utilizzi.
//
// Varianti:
//   ?cert=<certificate>&v=buyer   → generazione propria, QR → /verify?token=<cert>
//   ?cert=<certificate>&v=seller  → generazione col proprio volto, QR → /passport/<handle>
//   ?handle=<handle>&v=passport   → esagono #N al posto dell'immagine, QR → /passport/<handle>

export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;

// Palette SEMBLIC della cornice social: Obsidian (base), Lumen (testo), Amber
// (accento); teal resta colore di stato (verificato).
const C = {
  bg: "#0C0F17",
  panel: "#141A24",
  bar: "#141A24",
  border: "#1E2530",
  text: "#F2E9D8",
  soft: "rgba(242,233,216,0.70)",
  muted: "rgba(242,233,216,0.70)",
  teal: "#7FAE96",
  violet: "#F2A93B",
};

// Logo scudo: asset ufficiale in public/, recuperato una volta via URL statico
// (funziona identico in dev e su Vercel, dove public/ è servito ma non bundlato).
let logoCache: string | null = null;
async function logoDataUri(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch(`${siteUrl()}/logo-shield.png`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    logoCache = `data:image/png;base64,${buf.toString("base64")}`;
    return logoCache;
  } catch {
    return null;
  }
}

async function qrDataUri(url: string): Promise<string> {
  // ECC bassa = meno moduli = moduli più grandi = più leggibile alla dimensione della barra
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "L",
    margin: 1,
    color: { dark: C.bg, light: C.text },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const ordinali = (n: number) => `${n}ª`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const variant = (url.searchParams.get("v") ?? "buyer") as "buyer" | "seller" | "passport";
  const cert = url.searchParams.get("cert");
  const handle = url.searchParams.get("handle");
  const sb = createServerClient();
  const host = siteUrl().replace(/^https?:\/\//, "");

  // ── Raccolta dati per variante ────────────────────────────────────────────
  let avatar: Record<string, unknown> | null = null;
  let imageUrl: string | null = null; // null = variante passport (esagono)
  let qrTarget = "";
  let linkText = "";
  let certLabel = "";
  let whoLine = "";

  if (variant === "passport") {
    if (!handle) return new Response("handle mancante", { status: 400 });
    const { data } = await sb.from("avatars").select("*").eq("handle", handle).maybeSingle();
    if (!data || !isPublicAvatar(data)) return new Response("Not found", { status: 404 });
    avatar = data;
    qrTarget = `${siteUrl()}/passport/${data.handle}`;
    linkText = `${host}/passport/${data.handle}`;
    certLabel = `TOKEN ${truncateToken(data.token_hash as string)}`;
    const dal = new Date(data.created_at as string).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    whoLine = `Nel registro dal ${dal}`;
  } else {
    if (!cert) return new Response("cert mancante", { status: 400 });
    const { data: gen } = await sb
      .from("generations")
      .select("certificate, image_url, created_at, avatars(*)")
      .eq("certificate", cert)
      .maybeSingle();
    const av = Array.isArray(gen?.avatars) ? gen?.avatars[0] : gen?.avatars;
    if (!gen?.image_url || !av) return new Response("Not found", { status: 404 });
    avatar = av as Record<string, unknown>;
    imageUrl = gen.image_url as string;
    certLabel = `CERT. N. ${(gen.certificate as string).slice(0, 8).toUpperCase()}`;
    whoLine = `${ordinali(Number(avatar.usage_count) || 1)} generazione retribuita`;
    if (variant === "seller") {
      qrTarget = `${siteUrl()}/passport/${avatar.handle}`;
      linkText = `${host}/passport/${avatar.handle}`;
    } else {
      qrTarget = `${siteUrl()}/verify?token=${gen.certificate}`;
      linkText = `${host}/verify · ${(gen.certificate as string).slice(0, 8)}`;
    }
  }

  const [logo, qr] = await Promise.all([logoDataUri(), qrDataUri(qrTarget)]);
  // Numero progressivo nel registro per l'esagono (#N): posizione per data di ingresso
  let registryN = 0;
  if (variant === "passport" && avatar) {
    const { count } = await sb
      .from("avatars")
      .select("id", { count: "exact", head: true })
      .lte("created_at", avatar.created_at as string);
    registryN = count ?? 1;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          color: C.text,
          fontFamily: "sans-serif",
        }}
      >
        {/* Testata: scudo + wordmark | numero certificato */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "56px 64px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={88} height={88} alt="" />
            ) : null}
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, letterSpacing: "0.21em" }}>
              SEMBLIC
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: "0.1em", color: C.muted, whiteSpace: "nowrap" }}>
            {certLabel}
          </div>
        </div>

        {/* Immagine generata (~70% altezza) oppure esagono passport */}
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            margin: "0 56px",
            borderRadius: 48,
            border: `4px solid ${C.border}`,
            background: C.panel,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              width={968}
              height={1216}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                display: "flex",
                position: "relative",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Esagono vero (satori non supporta clip-path) */}
              <svg width={368} height={416} viewBox="0 0 100 113">
                <polygon points="50,0 100,28.25 100,84.75 50,113 0,84.75 0,28.25" fill={C.border} />
              </svg>
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  color: C.violet,
                  fontSize: 104,
                  fontWeight: 700,
                }}
              >
                {`#${registryN}`}
              </div>
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  bottom: 40,
                  right: 48,
                  fontSize: 30,
                  letterSpacing: "0.15em",
                  color: "rgba(242,233,216,0.70)",
                }}
              >
                IL TUO PASSAPORTO
              </div>
            </div>
          )}
        </div>

        {/* Barra-certificato: QR + badge + contatore + link */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            margin: "48px 56px 0",
            padding: "40px 48px",
            borderRadius: 40,
            background: C.bar,
            border: `4px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 168,
              height: 168,
              borderRadius: 32,
              background: C.text,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={152} height={152} alt="" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 44, fontWeight: 600, color: C.teal }}>
              {/* Spunta come SVG: il font di default di satori non ha il glifo ✓ */}
              <svg width={44} height={44} viewBox="0 0 24 24">
                <path d="M4 12.5 L10 18.5 L20 6.5" stroke={C.teal} strokeWidth={3} fill="none" />
              </svg>
              <div style={{ display: "flex" }}>
                {variant === "passport"
                  ? `Avatar certificato · #${registryN}`
                  : `Avatar certificato · ${avatar?.alias}`}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 44, color: C.soft }}>{whoLine}</div>
            <div style={{ display: "flex", fontSize: 40, color: C.muted }}>{linkText}</div>
          </div>
        </div>

        {/* Motto — unica riga di chiusura, niente frasi di campagna */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "56px 64px 64px",
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: "0.22em",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex" }}>REAL HUMANS. REAL RIGHTS.</div>
          <div style={{ display: "flex" }}>REAL EARNINGS.</div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
