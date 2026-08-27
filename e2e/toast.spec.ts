import { expect, test, type Page } from "@playwright/test";
import { dragCells, openComposer } from "./board";

/**
 * Where the toast actually SITS while it is animating.
 *
 * Every animation on the page is PAUSED before the toast is triggered, and each
 * sample scrubs it to an exact frame. Racing a 250ms entrance with a query
 * instead is how a real geometry bug gets recorded as a flake: the first draft
 * of this file sampled live, and the checks at 200ms and 250ms "passed" only
 * because the animation had already ended and there was nothing left to
 * measure. `sampleAt` therefore refuses to measure an element with no running
 * animation rather than quietly reporting its resting position.
 */

const FREEZE = "*, *::before, *::after { animation-play-state: paused !important; }";

type Sample = { left: number; top: number; width: number; viewport: number };

async function sampleAt(page: Page, at: number): Promise<Sample> {
  return page.evaluate((ms) => {
    const el = document.querySelector('[data-toast="error"]');
    if (el === null) throw new Error("no error toast on the page");

    const animations = el.getAnimations();
    if (animations.length === 0) {
      throw new Error("the toast has no running animation — nothing to sample");
    }
    for (const animation of animations) animation.currentTime = ms;

    const box = el.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, viewport: window.innerWidth };
  }, at);
}

test.describe("the error toast", () => {
  test.beforeEach(async ({ page }) => {
    const board = await openComposer(page);
    await page.addStyleTag({ content: FREEZE });

    await dragCells(page, board, [4, 4], [[5, 5]]);
    await page.getByRole("textbox", { name: "Name" }).fill("arrow-right");
    await page.getByRole("button", { name: "Publish icon" }).click();
    await expect(page.locator('[data-toast="error"]')).toBeVisible();
  });

  /* The centring offset lives on the `translate` property (Tailwind v4 compiles
     `-translate-x-1/2` to it) while the entrance animates `transform`. Those are
     SEPARATE properties and they COMPOSE, so a keyframe that also carries -50%
     drags the toast a full width to the left for as long as it runs, then snaps
     it back the instant the animation ends and `transform` returns to `none`.
     Only the box catches it — the computed transform reads plausibly either way. */
  for (const at of [0, 60, 125, 200, 249]) {
    test(`stays horizontally centred ${at}ms into its entrance`, async ({ page }) => {
      const { left, width, viewport } = await sampleAt(page, at);

      // The CENTRE, not the left edge. A left-edge assertion also moves when
      // the element's width changes, so it conflates "off centre" with
      // "mid-scale" — two different findings.
      expect(width).toBeGreaterThan(0);
      expect(left + width / 2).toBeCloseTo(viewport / 2, 0);
    });
  }

  test("holds one horizontal position for the whole entrance", async ({ page }) => {
    const frames: number[] = [];
    for (const at of [0, 50, 100, 150, 200, 249]) {
      const { left, width } = await sampleAt(page, at);
      frames.push(left + width / 2);
    }

    // Any horizontal drift at all is a defect: the toast is centred, and
    // centring is not something an entrance should be animating.
    const spread = Math.max(...frames) - Math.min(...frames);
    expect(spread).toBeLessThan(1);
  });

  test("ends its entrance exactly where it comes to rest", async ({ page }) => {
    // The snap the eye catches: the last animated frame and the settled element
    // have to describe the same box.
    const last = await sampleAt(page, 249);

    await page.evaluate(() => {
      const el = document.querySelector('[data-toast="error"]')!;
      for (const animation of el.getAnimations()) animation.cancel();
    });
    const settled = await page.evaluate(() => {
      const box = document.querySelector('[data-toast="error"]')!.getBoundingClientRect();
      return { left: box.left, top: box.top };
    });

    expect(last.left).toBeCloseTo(settled.left, 0);
    expect(last.top).toBeCloseTo(settled.top, 0);
  });

  test("slides down into place, since it lives at the top of the screen", async ({ page }) => {
    const start = await sampleAt(page, 0);
    const end = await sampleAt(page, 249);

    // Travels far enough to read as arriving rather than as a bare fade, and
    // DOWNWARD — a top-anchored toast that rises has come from off the wrong
    // edge and reads as the bottom one misplaced.
    expect(end.top - start.top).toBeGreaterThan(6);
  });
});
