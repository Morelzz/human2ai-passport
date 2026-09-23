// ──────────────────────────────────────────────────────────────────────────
// SEMBLIC DENTRO GLI AI (23/9/2026): il protocollo MCP, a mano e senza stato.
// Un assistente (Claude, ChatGPT, un agente qualsiasi) si collega a
// https://semblic.com/api/mcp e trova i nostri strumenti: cerca volti che hanno
// detto si', chiede se una persona consente una scena, legge i prezzi veri,
// verifica un contenuto. Prima di generare un essere umano, l'AI chiede a noi.
//
// Trasporto "Streamable HTTP" nella forma piu' semplice: ogni POST porta un
// messaggio JSON-RPC e riceve la risposta in JSON, niente sessioni e niente
// stream. Modulo PURO: prende il messaggio e gli strumenti, torna la risposta.
// Si prova senza rete e senza database.
// ──────────────────────────────────────────────────────────────────────────

export const VERSIONI_PROTOCOLLO = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"] as const;

export interface Strumento {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Tutti i nostri strumenti leggono e basta: nessuno spende, nessuno scrive. */
  annotations?: { readOnlyHint?: boolean; openWorldHint?: boolean; idempotentHint?: boolean };
  esegui: (args: Record<string, unknown>, ctx: ContestoChiamata) => Promise<EsitoStrumento>;
}

export interface ContestoChiamata {
  ip: string;
}

export interface EsitoStrumento {
  dati: unknown; // va in structuredContent e, come testo JSON, in content
  errore?: string; // errore dello strumento (isError): lo legge il modello, non e' un guasto del protocollo
}

type Id = string | number;
interface Richiesta {
  jsonrpc: "2.0";
  id?: Id | null;
  method?: string;
  params?: Record<string, unknown>;
}

export const ERR = { parse: -32700, richiesta: -32600, metodo: -32601, parametri: -32602, interno: -32603 } as const;

function errore(id: Id | null, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}
function risultato(id: Id, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

export interface InfoServer {
  name: string;
  title: string;
  version: string;
  instructions: string;
}

/**
 * Un messaggio JSON-RPC. Torna la risposta, o null per le notifiche e le
 * risposte del client (che vogliono un 202 senza corpo).
 */
export async function gestisciMessaggio(
  msg: unknown,
  strumenti: Strumento[],
  info: InfoServer,
  ctx: ContestoChiamata,
): Promise<Record<string, unknown> | null> {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return errore(null, ERR.richiesta, "Invalid Request");
  const r = msg as Richiesta;
  if (r.jsonrpc !== "2.0") return errore(r.id ?? null, ERR.richiesta, "Invalid Request: jsonrpc must be 2.0");
  const notifica = r.id === undefined || r.id === null;
  if (typeof r.method !== "string") {
    // Una risposta del client (non gli chiediamo mai niente): si accetta e si tace.
    return notifica || "result" in r || "error" in r ? null : errore(r.id!, ERR.richiesta, "Invalid Request: missing method");
  }
  if (notifica) return null; // notifications/initialized, notifications/cancelled, ...
  const id = r.id as Id;
  const params = r.params && typeof r.params === "object" ? r.params : {};

  switch (r.method) {
    case "initialize": {
      const chiesta = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const versione = (VERSIONI_PROTOCOLLO as readonly string[]).includes(chiesta) ? chiesta : VERSIONI_PROTOCOLLO[0];
      return risultato(id, {
        protocolVersion: versione,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: info.name, title: info.title, version: info.version },
        instructions: info.instructions,
      });
    }
    case "ping":
      return risultato(id, {});
    case "tools/list":
      return risultato(id, {
        tools: strumenti.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, ...(annotations ? { annotations } : {}) })),
      });
    case "tools/call": {
      const nome = params.name;
      const s = strumenti.find((x) => x.name === nome);
      if (!s) return errore(id, ERR.parametri, `Unknown tool: ${String(nome)}`);
      const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? (params.arguments as Record<string, unknown>) : {};
      try {
        const e = await s.esegui(args, ctx);
        if (e.errore) return risultato(id, { content: [{ type: "text", text: e.errore }], isError: true });
        return risultato(id, {
          content: [{ type: "text", text: JSON.stringify(e.dati, null, 2) }],
          structuredContent: e.dati && typeof e.dati === "object" && !Array.isArray(e.dati) ? e.dati : { risultato: e.dati },
        });
      } catch (err) {
        console.error(`[MCP] ${s.name} fallito:`, err instanceof Error ? err.message : err);
        return risultato(id, { content: [{ type: "text", text: "Semblic could not complete this request right now. Try again in a minute." }], isError: true });
      }
    }
    // Non offriamo risorse ne' prompt: liste vuote invece di un errore, cosi'
    // i client che le chiedono comunque non si spaventano.
    case "resources/list":
      return risultato(id, { resources: [] });
    case "prompts/list":
      return risultato(id, { prompts: [] });
    default:
      return errore(id, ERR.metodo, `Method not found: ${r.method}`);
  }
}

/** Il corpo di un POST: un messaggio o (versioni vecchie) un lotto. */
export async function gestisciCorpo(
  testo: string,
  strumenti: Strumento[],
  info: InfoServer,
  ctx: ContestoChiamata,
): Promise<unknown | null> {
  let corpo: unknown;
  try {
    corpo = JSON.parse(testo);
  } catch {
    return errore(null, ERR.parse, "Parse error");
  }
  if (Array.isArray(corpo)) {
    if (!corpo.length) return errore(null, ERR.richiesta, "Invalid Request: empty batch");
    const risposte = (await Promise.all(corpo.slice(0, 20).map((m) => gestisciMessaggio(m, strumenti, info, ctx)))).filter(Boolean);
    return risposte.length ? risposte : null;
  }
  return gestisciMessaggio(corpo, strumenti, info, ctx);
}
