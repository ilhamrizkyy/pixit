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
