import { defineConfig } from "vitest/config";

// Test di sola logica pura (niente DOM, niente Next). I file *.test.ts vivono
// accanto al codice che testano (es. lib/ward/consent.test.ts).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
