// Proxy (ex middleware): aggiorna la sessione Supabase a ogni richiesta e
// imposta la CSP con nonce (in Report-Only). Rinominato da middleware.ts a
// proxy.ts per la convenzione Next.js 16.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_ORIGIN = "https://ktjebfavzherochwhtis.supabase.co";
const BLOG_CDN = "https://d8j0ntlcm91z4.cloudfront.net";

// Il poster dell'hero e' l'elemento piu' grande della home (LCP). Lo chiediamo
// con l'header HTTP e non con un <link> nella pagina: l'header arriva col primo
// byte, prima che il browser legga una riga di HTML, e React non lo tocca
// (dentro la pagina il preload spariva, 21/9/2026).
const HERO_POSTER = `${SUPABASE_ORIGIN}/storage/v1/object/public/assets/hero-v3-poster.jpg`;

function buildCsp(nonce: string): string {
  // script-src con nonce + strict-dynamic (Next inietta i suoi script col nonce).
  // style-src 'unsafe-inline': stili inline di librerie (framer-motion ecc.); il
  // nonce non copre gli attributi style, e' un compromesso lato stile (lo script
  // resta blindato col nonce).
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    // tile.openstreetmap.org: le tile della mappa sedi (SediMap/Leaflet).
    `img-src 'self' data: blob: ${SUPABASE_ORIGIN} ${BLOG_CDN} https://tile.openstreetmap.org`,
    `font-src 'self' data:`,
    `connect-src 'self' ${SUPABASE_ORIGIN}`,
    `media-src 'self' ${SUPABASE_ORIGIN}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `report-uri /api/csp-report`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  // Nonce per-richiesta. Va anche sull'header CSP della RICHIESTA: Next lo legge
  // da li' per applicarlo ai propri script.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh della sessione SOLO se c'e' davvero una sessione: senza cookie di
  // Supabase (il visitatore anonimo della home) sarebbe un giro di rete inutile
  // prima di ogni pagina pubblica.
  if (request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    await supabase.auth.getUser();
  }

  // Browser: SOLO report (non blocca). Quando i report sono puliti, rinominare
  // l'header in "Content-Security-Policy" per passare all'enforce.
  response.headers.set("Content-Security-Policy-Report-Only", csp);
  response.headers.set("x-nonce", nonce);
  if (request.nextUrl.pathname === "/") {
    response.headers.set("Link", `<${HERO_POSTER}>; rel=preload; as=image; fetchpriority=high`);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
