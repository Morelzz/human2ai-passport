import { describe, expect, it } from "vitest";
import { ECHO_DEFAULT_MODEL, ECHO_MODELS, echoModel, isEchoModel } from "./echo-model";

describe("echoModel", () => {
  it("senza ECHO_MODEL usa il default", () => {
    expect(echoModel(undefined)).toBe(ECHO_DEFAULT_MODEL);
    expect(echoModel("")).toBe(ECHO_DEFAULT_MODEL);
  });

  it("accetta ogni modello ammesso, anche con spazi intorno", () => {
    for (const m of ECHO_MODELS) expect(echoModel(`  ${m} `)).toBe(m);
  });

  it("un valore sconosciuto o scritto male ricade sul default, non rompe la generazione", () => {
    expect(echoModel("gpt-image-3")).toBe(ECHO_DEFAULT_MODEL);
    expect(echoModel("GPT-IMAGE-2.5-FLARE")).toBe(ECHO_DEFAULT_MODEL);
    expect(echoModel("dall-e-3")).toBe(ECHO_DEFAULT_MODEL);
  });

  it("il default e' fra i modelli ammessi", () => {
    expect(isEchoModel(ECHO_DEFAULT_MODEL)).toBe(true);
  });
});
