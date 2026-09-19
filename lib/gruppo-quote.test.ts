import { describe, expect, it } from "vitest";
import { conQuoteDiGruppo } from "./gruppo-quote";

const r = (id: string, royalty: number, giorno: string) => ({ id, royalty_cents: royalty, created_at: `2026-09-${giorno}T10:00:00Z` });

describe("quote delle scene di gruppo", () => {
  it("senza gruppi le righe restano come sono", async () => {
    const righe = [r("a", 10, "18")];
    expect(await conQuoteDiGruppo(righe, [], async () => [])).toEqual(righe);
  });

  it("dove il volto e' il primo vale la sua parte, non il totale", async () => {
    const out = await conQuoteDiGruppo([r("g", 12, "18")], [{ generation_id: "g", avatar_id: "stella", royalty_cents: 6 }], async () => []);
    expect(out[0].royalty_cents).toBe(6);
  });

  it("le foto di gruppo dove non e' il primo si aggiungono, in ordine di data", async () => {
    const out = await conQuoteDiGruppo(
      [r("a", 10, "17")],
      [{ generation_id: "g", avatar_id: "stella", royalty_cents: 6 }],
      async (ids) => ids.map((id) => r(id, 12, "19")),
    );
    expect(out.map((x) => [x.id, x.royalty_cents])).toEqual([["g", 6], ["a", 10]]);
  });
});
