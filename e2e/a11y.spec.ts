import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility scan across every public surface plus the composer.
 *
 * An axe pass is a FLOOR, not a certificate — it catches the mechanical faults
 * (contrast, missing names, broken landmarks, duplicate ids) and cannot judge
 * whether a control makes sense to operate without sight. It is worth running
 * because those mechanical faults are exactly the ones that creep in silently
 * while attention is on how something looks.
 *
 * Scoped to WCAG 2 A and AA, which is the bar DESIGN.md's quality floor implies.
 */

const RULES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const scan = (page: Page) => new AxeBuilder({ page }).withTags(RULES);

/**
 * LET EVERY ENTRANCE FINISH BEFORE SCANNING.
 *
 * axe composites opacity when it computes a contrast pair, so a scan that lands
 * mid-animation measures a colour that exists for about 200ms and nowhere in
 * the palette. The detail bar fades in on 250ms, and this caught it at roughly
 * 97%: `#71717b on #f5f5f6` — 4.43:1 — for a pairing that settles at
 * `#6a6a74 on #f4f4f5`, 4.86:1. The grid's entrance wave is the same hazard on
 * every other scan here.
 *
 * Same fix, and the same reasoning, as the theme-transition wait in
 * contrast.spec.ts: CSS animations are in `getAnimations()`, so they can simply
 * be awaited.
 */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]),
  );
}

for (const [name, path] of [
  ["gallery", "/"],
  ["guide", "/guide"],
  ["resources", "/resources"],
  ["contribute", "/contribute"],
  ["composer", "/create"],
] as const) {
  test(`${name} has no automatically detectable a11y violations`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    const results = await scan(page).analyze();
    expect(results.violations).toEqual([]);
  });
}

/**
 * The gallery again, at phone width.
 *
 * Not redundant with the scan above: below `lg` the page is a genuinely
 * different set of elements. The sidebar is gone, the filter button that
 * replaces it exists only here, and the category tabs switch from a column on
 * the sidebar's edge to a strip across the sheet — so nothing in the wide scan
 * has ever looked at them. Everything `display: none` is invisible to axe,
 * which is what made the gap easy to miss.
 */
test("the gallery has no a11y violations at phone width either", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Display settings" })).toBeVisible();

  await settle(page);
  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});

test("the screen and the detail bar are reachable and announced", async ({
  page,
}) => {
  await page.goto("/");

  // The screen is part of the board and is there before anything is chosen.
  const screen = page.getByRole("region", { name: "Preview screen" });
  await expect(screen).toBeVisible();
  await expect(page.getByRole("region", { name: "Selected icon" })).toHaveCount(0);

  await page.getByRole("button", { name: /arrow-right/ }).first().click();

  const bar = page.getByRole("region", { name: "Selected icon" });
  await expect(bar).toBeVisible();
  // NEITHER is a dialog. Both are parts of the board; nothing opens, so
  // nothing may claim to.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(bar).not.toHaveAttribute("aria-modal", "true");

  // The status lives on the SCREEN, not on the bar, because it has to cover
  // clearing too — and the bar does not exist to announce its own removal.
  await expect(screen.locator("[aria-live]")).toHaveText("arrow-right loaded");

  await settle(page);
  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});
