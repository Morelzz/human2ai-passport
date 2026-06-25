import { describe, it, expect, vi } from "vitest";

// embed e' il confine con face-api (pesante, validato dall'e2e). Qui lo mockiamo
// per testare SOLO la logica di glue di match: branch "nessun volto" + classify.
vi.mock("./embed", () => ({ embed: vi.fn() }));

import { embed } from "./embed";
import { match } from "./index";

const mockEmbed = vi.mocked(embed);

describe("match (glue embed + classify)", () => {
  it("discard se il candidato non ha volti (descriptor null)", async () => {
    mockEmbed.mockResolvedValue({ descriptor: null, faceCount: 0, frontality: null });
    const r = await match([[0, 0]], new Uint8Array([1]));
    expect(r.band).toBe("discard");
    expect(r.faceCount).toBe(0);
    expect(r.distance).toBe(Infinity);
    expect(r.score).toBe(0);
  });

  it("classifica per distanza minima ai riferimenti (confirmed)", async () => {
    mockEmbed.mockResolvedValue({ descriptor: [0, 0], faceCount: 1, frontality: 1 });
    const refs = [
      [0, 0.2],
      [10, 10],
    ];
    const r = await match(refs, new Uint8Array([1]), { confirmedMaxDist: 0.5, reviewMaxDist: 0.6 });
    expect(r.band).toBe("confirmed");
    expect(r.faceCount).toBe(1);
    expect(r.distance).toBeCloseTo(0.2, 6);
  });

  it("non ritorna MAI il descrittore del candidato (A2.2)", async () => {
    mockEmbed.mockResolvedValue({ descriptor: [1, 2, 3], faceCount: 1, frontality: 1 });
    const r = await match([[1, 2, 3]], new Uint8Array([1]));
    expect(r).not.toHaveProperty("descriptor");
    expect(r.band).toBe("confirmed");
    expect(r.distance).toBe(0);
  });
});
