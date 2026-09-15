import { expect, test } from "@playwright/test";
import { cellPoint, drawn, openComposer, rect } from "./board";

/**
 * The composer under a FINGER.
 *
 * A desktop run cannot stand in for this. With `hasTouch` the browser sends
 * pointerType "touch" and no hover events at all, the compact layout renders
 * instead of the two tool columns, and `touch-action` decides whether a drag
 * paints or scrolls the page out from under it. All three are real ways this
 * surface can break on a phone while every mouse test stays green.
 */

test("a tap paints the cell under the finger", async ({ page }) => {
  const board = await openComposer(page);
  const point = await cellPoint(board, 5, 5);

  await page.touchscreen.tap(point.x, point.y);

  expect(await drawn(page)).toEqual([5 * 11 + 5]);
});

test("a touch drag paints the rectangle rather than scrolling the page", async ({ page }) => {
  const board = await openComposer(page);

  /* Raw touch events over CDP: Playwright's touchscreen can tap but not drag,
     and a synthetic pointerdown dispatched at the element would bypass hit
     testing and pointer capture — the two things most likely to be wrong. */
  const cdp = await page.context().newCDPSession(page);
  const from = await cellPoint(board, 3, 3);
  const to = await cellPoint(board, 6, 7);

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let step = 1; step <= 6; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / 6,
          y: from.y + ((to.y - from.y) * step) / 6,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  expect(await drawn(page)).toEqual(rect([3, 3], [6, 7]));
  // The page must not have moved: the board sets `touch-action: none` precisely
  // so a paint gesture is not read as a scroll.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("the phone dock keeps Save reachable without a horizontal scroll", async ({ page }) => {
  await openComposer(page);

  const save = page.getByRole("button", { name: "Save draft" });
  await expect(save).toBeVisible();
  await expect(page.getByRole("button", { name: "Icon details" })).toBeVisible();

  // The defect this replaces: the wide row used to wrap into a tall slab parked
  // over the toy, hiding the tool strip and the saturation slider.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});

/**
 * THE SIZE METER'S CARETS ARE REAL TOUCH TARGETS.
 *
 * They were **24 x 28px** on an iPhone 13 — measured, not guessed — against the
 * 44px coarse-pointer minimum DESIGN.md §6 already holds the category chips to.
 * Two separate causes, and only one of them was a regression:
 *
 *   - THE HEIGHT WAS ALWAYS 28. The row is sized by the carets' own content and
 *     nothing ever put a floor under it.
 *   - THE WIDTH BROKE ON 2026-09-13, when the blocks widened to ten cells so the
 *     desktop bar's size control would close the gap beside it. The blocks are a
 *     FIXED track, so on the sheet's 342px pad all 306px of them fitted and the
 *     two carets split what was left.
 *
 * Both halves are asserted, because fixing the width alone leaves a 44x28
 * target that still fails the rule and passes a width-only check.
 */
test("the size meter's carets clear the touch minimum", async ({ page }) => {
  await page.goto("/");
  await page.locator(".pixl-screen-key").tap();
  await expect(page.getByRole("dialog")).toBeVisible();

  /* SCOPED TO THE SHEET. The toolbar's own copy of these controls is still in
     the DOM at phone width — it is inside a `hidden lg:contents` wrapper, so it
     renders and simply paints nothing — which means a bare locator finds four
     carets, two of them zero-sized. Measuring those would pass this test while
     the ones a thumb can actually reach stayed 24px. */
  const sheet = page.getByRole("dialog");
  const carets = sheet.locator(".pixl-meter-key");
  await expect(carets).toHaveCount(2);

  /* POLLED, because the sheet scales in on open: measured mid-entrance a 44px
     caret reads 43.8 and fails a rule it meets. That only surfaced when the set
     grew to 108 icons (2026-09-15) and the page got slower to settle. */
  for (let index = 0; index < 2; index++) {
    await expect
      .poll(
        async () => {
          const box = (await carets.nth(index).boundingBox())!;
          return Math.min(box.width, box.height);
        },
        { message: `caret ${index} should clear 44px once the sheet has opened` },
      )
      .toBeGreaterThanOrEqual(44);
  }

  /* AND THE METER STILL FITS THE SHEET. The carets could clear 44 by pushing
     the blocks out of the pad, which trades one defect for a worse one. */
  const pad = (await sheet
    .locator(".pixl-pad", { has: page.locator(".pixl-meter-blocks") })
    .boundingBox())!;
  const blocks = (await sheet.locator(".pixl-meter-blocks").boundingBox())!;
  expect(blocks.x).toBeGreaterThanOrEqual(pad.x - 1);
  expect(blocks.x + blocks.width).toBeLessThanOrEqual(pad.x + pad.width + 1);
});
