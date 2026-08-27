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
  await page.goto("/");
  await page.getByRole("button", { name: /arrow-right/ }).first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();

  // Scoped to the panel: the set contains an icon named "close", so an
  // unscoped lookup finds its card too.
  await panel.getByRole("button", { name: "Close" }).click();
  // No deferred unmount: someone who asked for less motion is not made to wait
  // 350ms for an exit animation that has been reduced to nothing.
  await expect(panel).toBeHidden({ timeout: 120 });
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
