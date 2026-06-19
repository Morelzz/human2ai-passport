import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadWardData } from "./load-server";

// Smoke read-only: chiama loadWardData con l'owner di un avatar reale e verifica
// che TUTTE le query girino sullo schema e ritornino una WardData valida. Niente
// scrittura. Si auto-salta senza credenziali o senza avatar posseduti.

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvLocal();

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = !!SB_URL && !!SB_KEY;

describe.skipIf(!ready)("loadWardData (query reali sullo schema)", () => {
  let ownerId = "";

  beforeAll(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(SB_URL!, SB_KEY!);
    const { data } = await sb.from("avatars").select("owner_id").not("owner_id", "is", null).limit(1).maybeSingle();
    ownerId = data?.owner_id ?? "";
  });

  it("gira tutte le query e ritorna una WardData valida per un avatar posseduto", async () => {
    if (!ownerId) {
      console.log("(nessun avatar con owner_id: niente da testare)");
      return;
    }
    const res = await loadWardData(ownerId);
    expect(res).not.toBeNull();
    expect(res!.avatarId).toBeTruthy();
    expect(typeof res!.data.identity.handle).toBe("string");
    expect(Array.isArray(res!.data.detections)).toBe(true);
    expect(Array.isArray(res!.data.vault)).toBe(true);
    expect(res!.data.stats).toHaveProperty("confirmed");
    console.log(`loadWardData ok: ${res!.data.identity.handle}, detections ${res!.data.detections.length}, status ${res!.data.status}`);
  });
});
