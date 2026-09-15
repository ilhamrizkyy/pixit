import { expect, test, type Page } from "@playwright/test";
import { openColor } from "./board";

/**
 * PIXEL MATERIALIZE — the mini screen's reveal.
 *
 * A selected icon assembles out of the panel: every filled cell fades up on its
 * own delay scattered across the window, with transient noise inside the icon's
 * own bounds while it happens.
 *
 * Playwright rather than Vitest for the usual reason. Every property here is a
 * computed style or a rendered geometry, and jsdom has neither.
 *
 * EVERY QUERY IS SCOPED TO ONE DIRECTION. Leaving runs the same scatter in
 * reverse and the two layers OVERLAP, so an unscoped `.pixl-reveal-cell` reads
 * the outgoing icon's cells alongside the incoming one's. That is what made a
 * deterministic hash look unstable.
 */

/**
 * Delays, in ms, in the order the cells are written.
 *
 * IT WAITS FOR THE REVEAL RATHER THAN ASSUMING IT. Selecting an icon flushes
 * through an effect, so for one tick the panel still shows the PREVIOUS icon,
 * settled and merged, with no animated cells at all. Reading straight after the
 * click returned an empty list and made a deterministic hash look unstable.
 */
async function delays(page: Page) {
  await page.waitForFunction(
    () => document.querySelectorAll('[data-reveal="in"] .pixl-reveal-cell').length > 0,
  );
  return page.evaluate(() =>
    [...document.querySelectorAll<SVGElement>('[data-reveal="in"] .pixl-reveal-cell')].map((el) =>
      Number.parseFloat(getComputedStyle(el).animationDelay) * 1000,
    ),
  );
}

async function select(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click();
}

test("the icon assembles from scattered cells, not a wipe", async ({ page }) => {
  await page.goto("/");
  await select(page, /floppy-disk/);

  const spread = await delays(page);
  expect(spread.length, "no cells are animating").toBeGreaterThan(8);

  /* SCATTERED IS THE WHOLE POINT, and it is what a bounding box cannot see: a
     clean wipe animates exactly the same number of cells over exactly the same
     window and looks nothing like this. A wipe's delays only ever RISE in
     document order, so counting the descents is what separates the two. */
  let descents = 0;
  for (let i = 1; i < spread.length; i++) {
    if (spread[i] < spread[i - 1]) descents++;
  }
  const share = descents / (spread.length - 1);
  expect(
    share,
    `only ${(share * 100).toFixed(0)}% of the order goes backwards, which is a sweep`,
  ).toBeGreaterThan(0.3);

  // And they are spread across the window rather than firing together.
  expect(Math.max(...spread) - Math.min(...spread)).toBeGreaterThan(300);
});

test("the same icon materialises the same way every time", async ({ page }) => {
  await page.goto("/");

  /* DETERMINISTIC, and not for its own sake: `Math.random()` during render
     would give the server and the client different delays, and this route
     prerenders, so it would be a hydration mismatch. Stability across two
     selections is the observable half of that. */
  await select(page, /floppy-disk/);
  const first = await delays(page);
  await page.waitForTimeout(1000);

  await select(page, /arrow-right/);
  await page.waitForTimeout(1000);
  await select(page, /floppy-disk/);
  const second = await delays(page);

  expect(second).toEqual(first);
});

test("the static burst stays inside the icon's own bounds", async ({ page }) => {
  await page.goto("/");
  await select(page, /floppy-disk/);

  const bounds = await page.evaluate(() => {
    const box = (el: SVGGraphicsElement) => el.getBBox();
    const cells = [
      ...document.querySelectorAll<SVGGraphicsElement>('[data-reveal="in"] .pixl-reveal-cell'),
    ].map(box);
    const noise = [
      ...document.querySelectorAll<SVGGraphicsElement>('[data-reveal="in"] .pixl-reveal-noise'),
    ].map(box);
    const art = {
      left: Math.min(...cells.map((b) => b.x)),
      top: Math.min(...cells.map((b) => b.y)),
      right: Math.max(...cells.map((b) => b.x + b.width)),
      bottom: Math.max(...cells.map((b) => b.y + b.height)),
    };
    return {
      count: noise.length,
      outside: noise.filter(
        (b) =>
          b.x < art.left - 0.01 ||
          b.y < art.top - 0.01 ||
          b.x + b.width > art.right + 0.01 ||
          b.y + b.height > art.bottom + 0.01,
      ).length,
    };
  });

  // Noise over the whole panel reads as interference; noise inside the drawing
  // reads as the drawing condensing, which is the difference this makes.
  expect(bounds.count, "no static at all").toBeGreaterThan(0);
  expect(bounds.outside, "static is spilling off the icon").toBe(0);
});

test("it settles to the merged walk, and a recolour does not replay it", async ({
  page,
}) => {
  await page.goto("/");
  await select(page, /floppy-disk/);
  await page.waitForTimeout(1100);

  /* SETTLING MATTERS BEYOND TIDINESS. `layoutCells` merges horizontal runs for
     `solid`, and DESIGN.md §6 records that the merge is what removes the
     anti-aliasing seam between abutting rects. The reveal has to draw one node
     per cell to animate them separately, so the finished picture goes back to
     the merged walk and the resting image is the one every other surface
     draws. */
  const rest = await page.evaluate(() => ({
    animating: document.querySelectorAll('[data-reveal="in"] .pixl-reveal-cell').length,
    noise: document.querySelectorAll('[data-reveal="in"] .pixl-reveal-noise').length,
    dots: document.querySelectorAll(".pixl-reveal-dots circle").length,
    rects: document.querySelectorAll(".pixl-mini-glass svg rect").length,
  }));
  expect(rest.animating, "the reveal never handed over").toBe(0);
  expect(rest.noise).toBe(0);
  // The panel keeps its unlit cells at rest: a dot-matrix display that is on.
  expect(rest.dots).toBe(121);
  const merged = rest.rects;
  expect(merged).toBeGreaterThan(0);

  /* AND THE REVEAL KEYS ON THE ICON, NEVER ON THE CELLS. `displayCells` is
     rebuilt whenever colour, shape or size changes, so keying on the array
     would re-materialise the whole picture on every frame of a knob drag. */
  const panel = await openColor(page);
  await panel.getByRole("slider", { name: /Hue/ }).focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");

  expect(
    await page.evaluate(
      () => document.querySelectorAll('[data-reveal="in"] .pixl-reveal-cell').length,
    ),
    "recolouring replayed the reveal",
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.querySelectorAll(".pixl-mini-glass svg rect").length,
    ),
    "the settled picture stopped tracking the colour",
  ).toBe(merged);
});

/**
 * CLEARING IS THE SAME EFFECT, REVERSED.
 *
 * It was one uniform fade of the finished, merged picture, which made
 * deselecting a different KIND of event from selecting: the icon condensed cell
 * by cell and then vanished as a block. A dot-matrix panel does not clear that
 * way.
 */
test("deselecting scatters the cells out, it does not fade the picture", async ({
  page,
}) => {
  await page.goto("/");
  await select(page, /floppy-disk/);
  await page.waitForTimeout(700);

  /* A SWAP, NOT A DESELECT (2026-09-12), and the change is a real narrowing.
     The mini screen moved into the detail shelf, and the shelf unmounts 150ms
     after Close — so on a deselect the panel is GONE well before a scatter with
     80ms of stagger could finish, and the cells never get to leave.

     The behaviour survives where it actually reads: swapping icons. §6 already
     required the out to OVERLAP the next reveal rather than run before it,
     precisely so clicking a second icon does not wait out a dissolve — so this
     is the case the animation was tuned for, and it is the one still on screen
     long enough to see. Deselecting now removes the whole shelf, which is a
     different kind of event whatever the cells do inside it. */
  await page.getByRole("button", { name: /arrow-right/ }).first().click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-reveal="out"] .pixl-reveal-cell').length >
      0,
  );

  const going = await page.evaluate(() => {
    const cells = [
      ...document.querySelectorAll<SVGElement>(
        '[data-reveal="out"] .pixl-reveal-cell',
      ),
    ];
    const style = cells.map((el) => getComputedStyle(el));
    return {
      count: cells.length,
      delays: style.map((cs) => Number.parseFloat(cs.animationDelay) * 1000),
      names: [...new Set(style.map((cs) => cs.animationName))],
      duration: Number.parseFloat(style[0].animationDuration) * 1000,
    };
  });

  expect(going.count, "nothing is leaving").toBeGreaterThan(8);
  // PER CELL AND SHUFFLED: a block fade would give every cell one delay.
  expect(new Set(going.delays).size).toBeGreaterThan(5);
  expect(Math.max(...going.delays)).toBeGreaterThan(80);
  // Its own keyframes, not the arrival played backwards.
  expect(going.names).toEqual(["pixl-dematerialize"]);
  // FASTER THAN ARRIVING, which is DESIGN.md §5b rather than a taste.
  const arriving = await page.evaluate(
    () =>
      Number.parseFloat(
        getComputedStyle(
          document.querySelector(".pixl-mini-glass svg")!,
        ).getPropertyValue("--reveal-fade"),
      ) * 1000,
  );
  expect(going.duration).toBeLessThan(arriving);

  // And the panel settles on the NEW icon rather than on nothing: a swap ends
  // with a picture, which is the half a deselect no longer gets to show.
  await page.waitForTimeout(900);
  expect(
    await page.evaluate(
      () => document.querySelectorAll('[data-reveal="out"]').length,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.querySelectorAll(".pixl-reveal-dots circle").length,
    ),
  ).toBe(121);
});

