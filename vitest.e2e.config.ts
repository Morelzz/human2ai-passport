import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Config SEPARATA per i test end-to-end del motore Ward (face-api reale, rete,
// Supabase). NON girano in `npm test` (che resta logica pura: include *.test.ts):
// qui l'include e' *.e2e.ts. Pool "forks" perche' tfjs-backend-wasm va nel
// processo come nello spike, non in un worker thread. Alias "@" perche' qui si
// importano moduli reali (scan-repo -> @/lib/supabase).
//   npx vitest run --config vitest.e2e.config.ts
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    include: ["lib/**/*.e2e.ts"],
    environment: "node",
    pool: "forks",
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
