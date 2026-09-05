import { expect, test } from "@playwright/test";

/**
 * `prefers-reduced-motion: reduce`, verified rather than assumed.
 *
 * DESIGN.md claims every animation sits behind the global rule. The rule is one
 * blanket selector, so the risk is not that it fails to apply — it is the two
 * places CSS cannot reach: motion driven from JavaScript timers, and an
 * animation whose neutralised state is worse than the animation. Both have
 * already bitten this project once: the caret's two-step blink froze on its
 * DIM frame under the global rule and became nearly invisible, which is why it
 * carries an override of its own.
 */

/* Emulated per test rather than declared with `test.use`, which this
   Playwright build does not type for `reducedMotion`. Same effect, and it says
   plainly where the preference comes from. */
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("the media query actually reaches the page", async ({ page }) => {
  await page.goto("/");
  const reduced = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(reduced).toBe(true);
});

test("the toy's entrance is neutralised", async ({ page }) => {
  await page.goto("/create");
  const frame = page.locator(".toy-frame");
  await expect(frame).toBeVisible();

  const seconds = await frame.evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).animationDuration),
  );
  // Parsed, not string-matched: the blanket rule sets 0.01ms and engines
  // serialise that differently ("0.00001s" vs "1e-05s"). What matters is that
  // it rounds to nothing.
  expect(seconds).toBeLessThan(0.001);
});

test("the caret stays VISIBLE rather than freezing on its dim frame", async ({ page }) => {
  await page.goto("/create");
  const board = page.getByRole("application", { name: /Drawing grid/ });
  await board.focus();

  const caret = page.locator('[data-caret="cursor"]');
  const style = await caret.evaluate((el) => {
    const computed = getComputedStyle(el);
    return { animation: computed.animationName, opacity: computed.opacity };
  });

  // The blanket rule collapses an animation to 0.01ms, which lands it on
  // whichever keyframe happens to be first — for a blink, the DIM one. The
  // caret opts out entirely instead.
  expect(style.animation).toBe("none");

  /* Asserted as "not stuck dim" rather than "exactly 1". The caret legitimately
     retires to 0 after a few idle seconds, so pinning it to 1 is a race against
     that timer — it passed alone and failed under a parallel run, which is the
     signature of a test measuring a window rather than a property. What the
     override actually guarantees is that the caret is never left on the blink's
     dim keyframe, and that holds whether it is awake or retired. */
  const opacity = Number(style.opacity);
  expect([0, 1]).toContain(opacity);
});

test("an overlay closes immediately instead of waiting out an exit it will not play", async ({
  page,
}) => {
  // THE FILTER SHEET, not the detail bar. The bar unmounts the moment you
  // clear it — it is a strip of the chassis, not an overlay, so it has no
  // deferred unmount for this to measure and pointing the test at it would
  // have made it pass for no reason. The sheet still defers, so it is the one
  // thing left on this route that this rule can actually be checked against.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Display settings" }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  await sheet.getByRole("button", { name: "Close without applying" }).click();
  // No deferred unmount: someone who asked for less motion is not made to wait
  // 350ms for an exit animation that has been reduced to nothing.
  await expect(sheet).toBeHidden({ timeout: 120 });
});

test("a toast still appears and still leaves", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Save draft" }).click();

  const toast = page.locator('[data-toast="error"]');
  await expect(toast).toBeVisible();
  // Still self-dismisses — reduced motion removes the animation, not the
  // behaviour. A toast that never left would be a permanent obstruction.
  await expect(toast).toBeHidden({ timeout: 8_000 });
});


/**
 * Wait out the mount animation before asking about the switch one.
 *
 * Without this the tests below pass for the wrong reason: the grid animates
 * once on first paint too, so a click landing inside that first 250ms finds a
 * running animation whether or not the swap replayed it. That made the
 * assertion green even with the React `key` removed — which is the exact
 * regression it exists to catch.
 */
async function settle(page: import("@playwright/test").Page) {
  await page
    .locator(".pixl-grid-swap")
    .evaluate((el) =>
      Promise.all(
        el
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      ),
    );
}

/**
 * The grid's category swap, both ways round.
 *
 * Worth a test of its own because the animation is REPLAYED by a React `key`
 * rather than declared once: if the key ever stopped changing with the
 * category, the class would still be on the element and the computed style
 * would still name the animation — nothing would look broken in CSS — but the
 * swap would go back to the one-frame flicker it was added to fix.
 */
test("the grid's category swap is neutralised", async ({ page }) => {
  await page.goto("/");
  await settle(page);
  await page.getByRole("tab", { name: "Arcade" }).click();

  const durations = await page
    .locator(".pixl-grid-swap li")
    .first()
    .evaluate((el) =>
      el.getAnimations().map((a) => Number(a.effect?.getTiming().duration ?? 0)),
    );

  expect(durations.length).toBeGreaterThan(0);
  for (const ms of durations) expect(ms).toBeLessThan(1);
});

test("the grid's category swap animates when motion is allowed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settle(page);
  await page.getByRole("tab", { name: "Arcade" }).click();
  /* THE WAVE IS DEBOUNCED BY 80ms (2026-09-04). The chips are an
     automatic-activation tablist, so holding an arrow key used to restart a
     676ms wave every 30-90ms and finish none of them. The filter is still
     instant; only the animation waits for the category to settle. */
  await page.waitForTimeout(120);

  const running = await page
    .locator(".pixl-grid-swap li")
    .first()
    .evaluate((el) =>
      el.getAnimations().map((a) => ({
        name: (a as CSSAnimation).animationName,
        ms: Number(a.effect?.getTiming().duration ?? 0),
        state: a.playState,
      })),
    );

  expect(running).toHaveLength(1);
  expect(running[0].name).toBe("pixl-icon-in");
  expect(running[0].state).toBe("running");
  /* `--duration-wave`, not `--duration-slow`. The wave was slowed on
     2026-09-04 and moved onto its own token: §5b's clocks govern surfaces
     opening and closing, and this is the screen redrawing its picture — the
     same exemption Pixel Materialize already holds. */
  expect(running[0].ms).toBe(560);

  // And it is a WAVE, not one animation on the block: each icon starts later
  // than the one before it, and the whole wave stays inside DESIGN.md's cap.
  const delays = await page
    .locator(".pixl-grid-swap li")
    .evaluateAll((els) =>
      els.map(
        (el) => Number(el.getAnimations()[0]?.effect?.getTiming().delay ?? -1),
      ),
    );
  expect(delays.length).toBeGreaterThan(3);
  expect(delays[0]).toBe(0);
  for (let i = 1; i < delays.length; i++) {
    expect(delays[i]).toBeGreaterThan(delays[i - 1]);
  }
  // 20ms an item, capped at 20 items: the cap is what holds the total as the
  // set grows, and it moved with the duration rather than being abandoned.
  expect(delays[delays.length - 1]).toBeLessThanOrEqual(400);
});

/**
 * THE MINI SCREEN'S REVEAL, AND WHY THE GLOBAL RULE IS NOT ENOUGH.
 *
 * The blanket `prefers-reduced-motion` block collapses every animation-DURATION
 * to 0.01ms, and it leaves `animation-delay` untouched. Pixel Materialize
 * spreads its cells across a 640ms window of delays, so under the global rule
 * alone the reveal degrades into cells popping in one at a time with no fade at
 * all: LOUDER than the animation it was supposed to suppress, and exactly the
 * flicker someone asking for less motion is asking not to see.
 */
test("the mini screen's reveal arrives at once, with no static", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /floppy-disk/ }).first().click();

  const state = await page.evaluate(() => {
    const cells = [
      ...document.querySelectorAll<SVGElement>(".pixl-reveal-cell"),
    ];
    return {
      scatter: cells.length,
      delays: [
        ...new Set(cells.map((el) => getComputedStyle(el).animationDelay)),
      ],
      // The MERGED picture, which is what the icon is supposed to look like.
      settled: document.querySelectorAll(".pixl-reveal-settled *").length,
      noiseShown: [
        ...document.querySelectorAll<SVGElement>(".pixl-reveal-noise"),
      ].filter((el) => getComputedStyle(el).display !== "none").length,
      // The panel itself is not motion: the unlit grid stays.
      dots: document.querySelectorAll(".pixl-reveal-dots circle").length,
    };
  });

  /* IT HANDS STRAIGHT TO THE MERGED PICTURE (2026-09-04). This asserted that
     the scatter still rendered with every delay collapsed to 0s, which is the
     right SHAPE of the rule and one step short of it: the CSS zeroed the delays
     but a JS timer still held the unmerged per-cell render for the full 530ms,
     and `layoutCells` merges horizontal runs precisely to remove the
     anti-aliasing seam between abutting rects. So the picture arrived with
     visible seams and re-knitted half a second later — a motion event, for
     somebody who asked for none. The settle timer now fires at 0. */
  expect(state.settled, "the merged picture never arrived").toBeGreaterThan(0);
  expect(state.scatter, "the scatter still renders and then re-knits").toBe(0);
  expect(state.delays).toEqual([]);
  expect(state.noiseShown, "the static burst still plays").toBe(0);
  expect(state.dots).toBe(121);
});

