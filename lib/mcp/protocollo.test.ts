import { describe, it, expect } from "vitest";
import { gestisciCorpo, gestisciMessaggio, ERR, VERSIONI_PROTOCOLLO, type Strumento } from "./protocollo";

const info = { name: "semblic", title: "Semblic", version: "1.0.0", instructions: "prova" };
const ctx = { ip: "1.2.3.4" };
const strumenti: Strumento[] = [
  {
    name: "eco",
    title: "Eco",
    description: "ripete",
    inputSchema: { type: "object", properties: { x: { type: "string" } } },
    annotations: { readOnlyHint: true },
    esegui: async (a) => ({ dati: { x: a.x ?? null } }),
  },
  { name: "sbaglia", title: "S", description: "", inputSchema: { type: "object" }, esegui: async () => ({ dati: null, errore: "no" }) },
  { name: "esplode", title: "E", description: "", inputSchema: { type: "object" }, esegui: async () => { throw new Error("boom"); } },
];
const chiama = (m: unknown) => gestisciMessaggio(m, strumenti, info, ctx);

describe("protocollo MCP", () => {
  it("initialize rimanda la versione chiesta se la conosciamo, altrimenti la piu' nuova", async () => {
    const a = (await chiama({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(a.result.protocolVersion).toBe("2025-06-18");
    expect(a.result.capabilities.tools).toBeTruthy();
    expect(a.result.serverInfo.name).toBe("semblic");
    const b = (await chiama({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(b.result.protocolVersion).toBe(VERSIONI_PROTOCOLLO[0]);
  });

  it("le notifiche non hanno risposta", async () => {
    expect(await chiama({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("tools/list elenca gli strumenti senza la funzione", async () => {
    const r = (await chiama({ jsonrpc: "2.0", id: 3, method: "tools/list" })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.result.tools.map((t: { name: string }) => t.name)).toEqual(["eco", "sbaglia", "esplode"]);
    expect(r.result.tools[0].esegui).toBeUndefined();
    expect(r.result.tools[0].annotations.readOnlyHint).toBe(true);
  });

  it("tools/call: risultato in testo e strutturato; errore dello strumento come isError", async () => {
    const ok = (await chiama({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "eco", arguments: { x: "ciao" } } })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(ok.result.structuredContent).toEqual({ x: "ciao" });
    expect(JSON.parse(ok.result.content[0].text)).toEqual({ x: "ciao" });
    const no = (await chiama({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "sbaglia" } })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(no.result.isError).toBe(true);
    const boom = (await chiama({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "esplode" } })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(boom.result.isError).toBe(true);
    expect(boom.result.content[0].text).not.toContain("boom");
  });

  it("strumento sconosciuto e metodo sconosciuto: errori JSON-RPC", async () => {
    const a = (await chiama({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "nessuno" } })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(a.error.code).toBe(ERR.parametri);
    const b = (await chiama({ jsonrpc: "2.0", id: 8, method: "sampling/createMessage" })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(b.error.code).toBe(ERR.metodo);
  });

  it("corpo rotto, messaggio non valido, lotto", async () => {
    expect(((await gestisciCorpo("{", strumenti, info, ctx)) as any).error.code).toBe(ERR.parse); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(((await gestisciCorpo('{"id":1,"method":"ping"}', strumenti, info, ctx)) as any).error.code).toBe(ERR.richiesta); // eslint-disable-line @typescript-eslint/no-explicit-any
    const lotto = (await gestisciCorpo(JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }]), strumenti, info, ctx)) as unknown[];
    expect(lotto).toHaveLength(1);
    expect(await gestisciCorpo(JSON.stringify({ jsonrpc: "2.0", id: 9, result: {} }), strumenti, info, ctx)).toBeNull();
  });
});
