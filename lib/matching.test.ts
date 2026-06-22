import { describe, it, expect } from "vitest";
import { scoreAvatar, specifiedCount, type ScorableAvatar, type PromptAttributes } from "./matching";

function attrs(p: Partial<PromptAttributes> = {}): PromptAttributes {
  return { gender: null, ethnicity: null, hair_color: null, age_min: null, age_max: null, eye_color: null, height: null, body_type: null, ...p };
}
function avatar(p: Partial<ScorableAvatar> = {}): ScorableAvatar {
  return { gender: "uomo", ethnicity: "italiano", hair_color: "neri", age_range: "25-35", commercial_consent: true, ...p };
}

describe("scoreAvatar (modello senza categorie: gate sul consenso commerciale)", () => {
  it("consenziente + identità che combacia -> allowed", () => {
    expect(scoreAvatar(avatar(), attrs({ gender: "uomo" })).allowed).toBe(true);
  });

  it("commercial_consent=false -> bloccato anche con identità perfetta", () => {
    const r = scoreAvatar(avatar({ commercial_consent: false }), attrs({ gender: "uomo" }));
    expect(r.allowed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("identità diversa -> bloccato", () => {
    expect(scoreAvatar(avatar({ gender: "donna" }), attrs({ gender: "uomo" })).allowed).toBe(false);
  });

  it("consenso assente (undefined dal DB NOT NULL) trattato come consenziente", () => {
    expect(scoreAvatar(avatar({ commercial_consent: undefined }), attrs({ gender: "uomo" })).allowed).toBe(true);
  });
});

describe("specifiedCount (senza categoria)", () => {
  it("conta solo gli attributi identità", () => {
    expect(specifiedCount(attrs())).toBe(0);
    expect(specifiedCount(attrs({ gender: "uomo" }))).toBe(1);
    expect(specifiedCount(attrs({ gender: "uomo", ethnicity: "italiano" }))).toBe(2);
  });
});
