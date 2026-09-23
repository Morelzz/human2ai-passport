import { createServerClient } from "@/lib/supabase";
import { allowRequest, ipFrom } from "@/lib/rate-limit";
import { gestisciCorpo } from "@/lib/mcp/protocollo";
import { strumentiSemblic, INFO_SEMBLIC } from "@/lib/mcp/strumenti";

// ──────────────────────────────────────────────────────────────────────────
// SEMBLIC DENTRO GLI AI: il server MCP pubblico (https://semblic.com/api/mcp).
// Streamable HTTP senza stato: POST con un messaggio JSON-RPC, risposta JSON.
// Niente GET (nessuno stream da aprire), niente sessioni. Solo lettura: gli
// strumenti non spendono e non generano (lib/mcp/strumenti).
// ──────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, mcp-protocol-version, mcp-session-id, authorization",
};

function risposta(body: unknown, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...(body === null ? {} : { "Content-Type": "application/json; charset=utf-8" }), "Cache-Control": "no-store", ...CORS },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// Nessuno stream dal server verso il client: la specifica vuole un 405.
export async function GET() {
  return new Response("Semblic MCP server: send JSON-RPC messages with POST.", { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS } });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS } });
}

export async function POST(request: Request) {
  const ip = ipFrom(request);
  if (!(await allowRequest(`mcp:${ip}`, 60, 60))) {
    return risposta({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Too many requests: slow down and retry in a minute." } }, 429);
  }
  const testo = (await request.text()).slice(0, 64_000);
  const out = await gestisciCorpo(testo, strumentiSemblic(createServerClient()), INFO_SEMBLIC, { ip });
  // Solo notifiche o risposte del client: 202 senza corpo.
  if (out === null) return risposta(null, 202);
  return risposta(out);
}
