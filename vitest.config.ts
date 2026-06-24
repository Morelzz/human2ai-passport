import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test di sola logica pura (niente DOM, niente Next). I file *.test.ts vivono
// accanto al codice che testano (es. lib/ward/consent.test.ts).
const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Stesso alias "@/..." di Next/tsc, cosi i test possono importare i moduli
    // dell'app. Ancorato a "@/" per non toccare i pacchetti "@scope/...".
    alias: [{ find: /^@\//, replacement: `${root}/` }],
  },
});
