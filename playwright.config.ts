import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the composer (PLAN.md Phase 4).
 *
 * These exist for the one thing the Vitest suite structurally cannot reach:
 * POINTER PATHS. Drag-fill, pointer capture, second-tap clear and the
 * slide-to-clear wipe are the composer's core interaction, and jsdom has no
 * layout, so a synthetic pointerdown there proves only that a handler was
 * called — not that it was called with the cell the user was actually over.
 *
 * They run against a PRODUCTION BUILD, not the dev server. The dev overlay puts
 * a fixed indicator over the bottom-left of the viewport, which is exactly
 * where the toy's left knob sits; and dev-mode double-rendering hides the class
 * of bug where an effect runs twice. Testing what ships is worth the build.
 *
 * Port 3100 so a dev server on 3000 can stay up while these run.
 */
export default defineConfig({
  testDir: "./e2e",
  // Vitest owns src/**/*.test.ts(x); Playwright owns e2e/**/*.spec.ts. Neither
  // runner can pick up the other's files, so `npm test` stays fast and honest.
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      testMatch:
        /(board|composer|a11y|contrast|reduced-motion|keys|reveal|toast|intro)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      // The touch path has its own project because `hasTouch` changes what the
      // browser sends: pointerType "touch", and no hover events at all. A
      // desktop run cannot stand in for it.
      name: "touch",
      testMatch: /touch\.spec\.ts/,
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
    /* WebKit and Firefox run the same desktop suite. The toy leans on several
       things engines genuinely disagree about — `mask` with a radial gradient,
       `color-mix`, `dvh`, and three WebGL canvases on one page — and WebKit is
       the engine behind every browser on iOS, so it is not optional coverage.
       Chromium alone would have told us nothing about any of it. */
    {
      name: "webkit",
      testMatch: /composer\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "firefox",
      testMatch: /composer\.spec\.ts/,
      use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // The composer is closed by default and gated in its route handler. The
    // tests need it open; nothing else does, and this never reaches a deploy.
    env: {
      PIXLE_COMPOSER_ENABLED: "true",
      /* ITS OWN BUILD DIRECTORY. `next dev` serves out of `.next`, and this
         command rebuilds it — so running the suite while a dev server was up
         deleted that server's chunks underneath it. The page still rendered and
         hydration never completed, so every control silently stopped
         responding. See the note in `next.config.ts`. */
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
