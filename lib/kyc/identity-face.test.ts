import { describe, it, expect, vi, beforeEach } from "vitest";

// CRIT-6: se i modelli face-api non caricano, il gate anti-impersonazione deve
// FALLIRE in modo tipato (fail-closed), non passare in silenzio. Mockiamo embed
// (lancia = modelli giu) e le dipendenze IO, e verifichiamo la propagazione.

vi.mock("@/lib/ward/matching/embed", () => ({
  embed: vi.fn(async () => {
    throw new Error("wasm models not loaded");
  }),
}));

// Il volto verificato si ricava SEMPRE dalla sessione Didit (23/9: la cache nel
// profilo l'utente la poteva riscrivere). Quindi la prova passa dal portrait:
// c'e' una sessione, il portrait si scarica, e l'embedding fallisce.
vi.mock("@/lib/kyc/didit", () => ({
  getDiditPortraitUrl: vi.fn(async () => "https://didit.test/portrait.jpg"),
}));
vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([9, 9, 9]), { status: 200 })));

// Profilo con una sessione di verifica e, di proposito, un descrittore in
// cache: non deve essere usato. Se lo fosse, l'embedding del reference si
// salterebbe e la prova sotto non la vedrebbe.
vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { identity_face_descriptor: Array(128).fill(0.1), identity_session_id: "sessione-1" },
          }),
        }),
      }),
      update: () => ({ eq: async () => ({}) }),
    }),
  }),
}));

import { checkBestFaceAgainstIdentity, IdentityModelsUnavailableError } from "./identity-face";

describe("gate identita fail-closed (CRIT-6)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("se i modelli non caricano, lancia IdentityModelsUnavailableError (non passa a vuoto)", async () => {
    await expect(
      checkBestFaceAgainstIdentity("user-1", [new Uint8Array([1, 2, 3])]),
    ).rejects.toBeInstanceOf(IdentityModelsUnavailableError);
  });

  it("NON usa l'impronta salvata nel profilo (la falla del 23/9): la ricava dalla verifica", async () => {
    const { getDiditPortraitUrl } = await import("@/lib/kyc/didit");
    await checkBestFaceAgainstIdentity("user-1", [new Uint8Array([1, 2, 3])]).catch(() => {});
    expect(getDiditPortraitUrl).toHaveBeenCalledWith("sessione-1");
  });
});
