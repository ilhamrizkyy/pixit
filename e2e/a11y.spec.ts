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

for (const [name, path] of [
  ["gallery", "/"],
  ["guide", "/guide"],
  ["resources", "/resources"],
  ["contribute", "/contribute"],
  ["composer", "/create"],
] as const) {
  test(`${name} has no automatically detectable a11y violations`, async ({ page }) => {
    await page.goto(path);
    const results = await scan(page).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("the icon detail panel is reachable and announced", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /arrow-right/ }).first().click();

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  // Non-modal by design: no aria-modal, and the grid behind stays reachable.
  await expect(panel).not.toHaveAttribute("aria-modal", "true");

  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});
