import { describe, it, expect, vi, beforeEach } from "vitest";

// CRIT-6: se i modelli face-api non caricano, il gate anti-impersonazione deve
// FALLIRE in modo tipato (fail-closed), non passare in silenzio. Mockiamo embed
// (lancia = modelli giu) e le dipendenze IO, e verifichiamo la propagazione.

vi.mock("@/lib/ward/matching/embed", () => ({
  embed: vi.fn(async () => {
    throw new Error("wasm models not loaded");
  }),
}));

vi.mock("@/lib/kyc/didit", () => ({
  getDiditPortraitUrl: vi.fn(async () => null),
}));

// Profilo con descrittore di identita GIA in cache: getIdentityDescriptor torna
// la cache senza embeddare il reference, cosi il fallimento avviene sull'embed
// delle FOTO caricate (il cuore del gate).
vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { identity_face_descriptor: Array(128).fill(0.1), identity_session_id: null },
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
});
