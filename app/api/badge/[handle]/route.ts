import { createServerClient } from "@/lib/supabase";

// ──────────────────────────────────────────────────────────────────────────
// Badge "Volto Verificato" — endpoint SVG embeddabile (Fase 4: lo standard).
// Un sito terzo lo incorpora come <img src=".../api/badge/<handle>">; il badge
// dichiara che dietro c'è una persona reale, consenziente e verificata, e linka
// alla prova (passport). ADDITIVO: non tocca alcun flusso esistente, riusa solo
// la lettura avatar. Onestà sulla timeline: se il consenso è revocato, lo dice.
// ──────────────────────────────────────────────────────────────────────────

// Escape minimale per inserire testo utente dentro l'SVG (XML-safe).
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const FONT = "'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";

function badgeSvg(opts: { alias: string; revoked: boolean }): string {
  const { alias, revoked } = opts;
  // Colore d'accento e stato secondo la timeline del consenso.
  const accent = revoked ? "#e0006f" : "#00d4be";
  const statusLabel = revoked ? "CONSENSO REVOCATO" : "VOLTO VERIFICATO";
  // Segno: spunta se attivo, croce se revocato.
  const mark = revoked
    ? `<path d="M15 17 l16 16 M31 17 l-16 16" fill="none" stroke="${accent}" stroke-width="3.2" stroke-linecap="round"/>`
    : `<path d="M14 25 l6 6 l13 -15" fill="none" stroke="${accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `<svg width="340" height="84" viewBox="0 0 340 84" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${statusLabel} su HUMAN2AI">
  <defs>
    <linearGradient id="h2ai-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b47f0"/>
      <stop offset="0.6" stop-color="#B8005C"/>
      <stop offset="1" stop-color="#00A896"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="338" height="82" rx="16" fill="#0a0a0f" stroke="rgba(255,255,255,0.12)"/>
  <g transform="translate(20,18)">
    <polygon points="24,0 48,12 48,36 24,48 0,36 0,12" fill="url(#h2ai-g)" opacity="0.16"/>
    <polygon points="24,4 44,14 44,34 24,44 4,34 4,14" fill="none" stroke="url(#h2ai-g)" stroke-width="2"/>
    ${mark}
  </g>
  <text x="86" y="35" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${accent}">${statusLabel}</text>
  <text x="86" y="56" font-family="${FONT}" font-size="14" font-weight="600" fill="#f0f0f5">${xmlEscape(alias)}</text>
  <text x="319" y="71" text-anchor="end" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="1.4" fill="#6b7280">HUMAN2AI</text>
</svg>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const supabase = createServerClient();

  const { data: avatar, error } = await supabase
    .from("avatars")
    .select("alias, verification_status, revoked_at")
    .eq("handle", handle)
    .single();

  // Stesso gate del registro pubblico: niente badge per avatar non approvati.
  if (error || !avatar) return new Response("Not found", { status: 404 });
  if ((avatar.verification_status ?? "approved") !== "approved") {
    return new Response("Not found", { status: 404 });
  }

  const alias = (avatar.alias as string) ?? handle;
  const aliasShort = alias.length > 20 ? alias.slice(0, 19) + "…" : alias;
  const svg = badgeSvg({ alias: aliasShort, revoked: Boolean(avatar.revoked_at) });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Cache breve: la revoca del consenso deve riflettersi in fretta.
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
