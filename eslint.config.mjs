import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Phase-staged stubs keep their real signatures so callers type-check
      // against the final shape. A leading underscore marks a parameter as
      // intentionally unused rather than forgotten.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // The e2e build, which is `.next` under another name: Playwright's
    // webServer sets NEXT_DIST_DIR so a production build cannot delete a
    // running dev server's chunks. Same generated output, same reason to skip
    // it — it reported 187 errors in code nobody here wrote.
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored agent skills — third-party code we neither wrote nor ship.
    // Linting it produced ~150 warnings that would bury our own.
    ".agents/**",
    ".claude/**",
    // Cloudflare build output. `.open-next/` is a bundled copy of the app plus
    // the adapter's runtime, so linting it reported 12,034 problems in code
    // nobody here wrote or can fix — enough to bury every real finding.
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;
