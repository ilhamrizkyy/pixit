import { test } from "@playwright/test";
const SHOT = "/private/tmp/claude-501/-Users-ilhamrizkyakbar-Documents-Pixboard/bd59b18f-d300-4971-b9fd-e5a5dc542ab0/scratchpad";
test("reveal frames", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(500);
  const mini = page.locator(".pixl-mini");
  await mini.screenshot({ path: `${SHOT}/rev-idle.png`, scale: "device" });

  await page.getByRole("button", { name: /floppy-disk/ }).first().click();
  for (const t of [120, 320, 560, 1100]) {
    await page.waitForTimeout(t === 120 ? 120 : 0);
    if (t !== 120) await page.waitForTimeout(t - (t === 320 ? 120 : t === 560 ? 320 : 560));
    await mini.screenshot({ path: `${SHOT}/rev-${t}.png`, scale: "device" });
  }
  console.log("nodes at rest:", await page.evaluate(() => ({
    dots: document.querySelectorAll(".pixl-reveal-dots circle").length,
    cells: document.querySelectorAll(".pixl-reveal-cell").length,
    noise: document.querySelectorAll(".pixl-reveal-noise").length,
    merged: document.querySelectorAll(".pixl-mini-glass svg > g:last-of-type rect").length,
  })));
});
