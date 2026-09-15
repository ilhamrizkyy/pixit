import { expect, test, type Page } from "@playwright/test";

/**
 * THE HOMEPAGE BOOT (2026-09-15): the hero loads like an arcade level, then
 * hands itself back as the ordinary hero.
 *
 * What these hold is the CONTRACT around the animation rather than its frames:
 * that it plays on every load, that the page underneath is always the finished
 * one, and that nobody is ever made to wait for it. Frame timing is a design
 * call and is left to the eye; a test that pinned "the block is 60% full at
 * 1.4s" would only ever fail on a deliberate retune.
 *
 * An automated browser skips the boot unless the address carries `?intro`,
 * which is why every other spec can measure the hero without waiting on it.
 */

const intro = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute("data-intro"));

test("an automated visit gets the finished hero with no boot at all", async ({ page }) => {
  await page.goto("/");
  expect(await intro(page)).toBeNull();
  await expect(page.getByRole("heading", { level: 1, name: "Pixit" })).toBeVisible();
});

/* EVERY LOAD, NOT ONCE A TAB. It was remembered in sessionStorage for a pass
   and a refresh then showed the finished hero, which read as broken. Measured
   as a real visitor, with the automation flag hidden, across a reload. */
test("a person sees the boot on every load, including a refresh", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  await page.goto("/");
  expect(await intro(page)).toBe("play");
  await page.keyboard.press("Escape");
  expect(await intro(page)).toBeNull();

  await page.reload();
  expect(await intro(page), "a refresh should boot again").toBe("play");
});

test("?intro plays the boot and hands the hero back", async ({ page }) => {
  await page.goto("/?intro");
  expect(await intro(page)).toBe("play");

  // Early in the boot the sentence has not wiped in: it is clipped away whole.
  const clip = () =>
    page.evaluate(() => getComputedStyle(document.querySelector(".pixl-hero-line > p")!).clipPath);
  expect(await clip()).toContain("100%");

  await expect.poll(() => intro(page), { timeout: 5000 }).toBeNull();
  expect(await clip()).toBe("none");
});

test("the content is in the document from the first byte, boot or no boot", async ({
  page,
}) => {
  await page.goto("/?intro");
  expect(await intro(page)).toBe("play");
  await expect(page.getByRole("heading", { level: 1, name: "Pixit" })).toBeAttached();
  await expect(page.getByRole("link", { name: "Explore icons" })).toBeAttached();
  await expect(page.getByRole("link", { name: "Read the guide" })).toBeAttached();
});

test("any key skips straight to the finished hero", async ({ page }) => {
  await page.goto("/?intro");
  await page.waitForTimeout(700);
  expect(await intro(page)).toBe("play");

  await page.keyboard.press("Tab");
  expect(await intro(page)).toBeNull();
});

test("reduced motion never boots", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?intro");
  expect(await intro(page)).toBeNull();
});

/* EXPLORE TRAVELS. A bare anchor teleports the page in a single frame; this
   samples the scroll position partway through the flight and requires it to be
   somewhere in between, then requires it to land on the gallery. */
test("Explore icons scrolls to the gallery rather than jumping", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // Where the gallery starts, or as far as the page can scroll if a short page
  // cannot bring it to the top (the 24-icon set ran out 250px early at 1440x900).
  const target = await page.evaluate(() =>
    Math.min(
      document.querySelector(".pixl-gallery")!.getBoundingClientRect().top + window.scrollY,
      document.documentElement.scrollHeight - window.innerHeight,
    ),
  );

  await page.getByRole("link", { name: "Explore icons" }).click();
  await page.waitForTimeout(180);
  const midway = await page.evaluate(() => window.scrollY);
  expect(midway, "the page should be in flight, not already there").toBeGreaterThan(0);
  expect(midway, "the page should be in flight, not already there").toBeLessThan(target - 20);

  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 3000 })
    .toBe(Math.round(target));
  // And it keeps the anchor's other job: keyboard focus arrives with the page.
  await expect(page.locator("#icon-panel")).toBeFocused();
});

/* THE X-RAY is Phosphor's inspect move, carrying Pixit's own mechanism: hover a
   sprite and its drawing gives way to the 11 by 11 lattice and its name. */
test("hovering a sprite x-rays it to its lattice and names it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // The fourth seat: fully on screen, clear of the type. Which icon is in it is
  // dealt at random, so the test asks for the seat rather than a name.
  const sprite = page.locator(".pixl-hero-sprite").nth(3);
  const xray = sprite.locator(".pixl-sprite-xray");

  await expect(xray).toHaveCSS("opacity", "0");
  await sprite.hover();
  await expect(xray).toHaveCSS("opacity", "1");
  await expect(sprite.locator(".pixl-sprite-art")).toHaveCSS("opacity", "0");
  await expect(sprite.locator(".pixl-sprite-tag")).toBeVisible();
  // One square per lit cell, on a lattice of the full canvas.
  expect(await xray.locator(".pixl-sprite-cell").count()).toBeGreaterThan(8);
});

/* THE ART IS DEALT, NOT FIXED (2026-09-15). Six seats, a fresh icon and neon in
   each on every load. Held: no icon twice, only the cabinet's four neons, the
   two big pieces in different colours, and a reload really deals again. Three
   loads matching exactly would take the same six icons in the same six seats
   out of a pool of 46, three times running. */
test("the hero's sprites are dealt at random, in neon, on every load", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const hands: string[] = [];

  for (let load = 0; load < 3; load++) {
    await page.goto("/");
    await expect(page.locator(".pixl-hero-sprite")).toHaveCount(6);
    const dealt = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".pixl-hero-sprite")].map((s) => ({
        id: s.querySelector(".pixl-sprite-tag")!.textContent!,
        neon: s.dataset.neon!,
      })),
    );

    expect(new Set(dealt.map((d) => d.id)).size, "an icon was dealt twice").toBe(6);
    for (const { neon } of dealt) {
      expect(["cyan", "yellow", "orange", "green"]).toContain(neon);
    }
    expect(dealt[0].neon, "the two big pieces share a colour").not.toBe(dealt[5].neon);
    hands.push(dealt.map((d) => `${d.id}:${d.neon}`).join(","));
  }

  expect(new Set(hands).size, "three loads dealt the same hand").toBeGreaterThan(1);
});
