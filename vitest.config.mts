import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Engine and registry tests run in the default node environment — the engine
 * has no DOM dependency, which is the architectural boundary (TECH-STACK.md)
 * paying off.
 *
 * Component tests opt into jsdom per file with a
 * `// @vitest-environment jsdom` docblock, so the fast node default is never
 * paid for by the pure tests.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
