import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * THE TEST BUILD GETS ITS OWN DIRECTORY, and this is a bug fix rather than a
   * preference.
   *
   * Playwright's `webServer` command is `npm run build && npm run start`, and
   * `next dev` serves out of the same `.next` a production build writes to. So
   * running the e2e suite while a dev server is up deletes that dev server's
   * artifacts and replaces them with production ones. The dev server keeps
   * running and keeps answering, but it serves chunks that no longer exist:
   * the page renders, hydration never completes, and NOTHING on it responds to
   * a click. No error, no 500, just a dead interface — which is a genuinely
   * hard symptom to trace back to "a test run happened".
   *
   * `playwright.config.ts` sets `NEXT_DIST_DIR=.next-e2e`, so the two never
   * share a directory again. Anything else, including `npm run dev` and the
   * real deploy build, is untouched.
   */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
