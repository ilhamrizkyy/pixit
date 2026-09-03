import { expect, test } from "@playwright/test";
test("probe", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: `.pixl-card{box-shadow:none!important}` });
  const v = await page.evaluate(() => {
    const el = document.querySelector(".pixl-card")!;
    return { shadow: getComputedStyle(el).boxShadow, n: document.querySelectorAll(".pixl-card").length };
  });
  console.log("PROBE", JSON.stringify(v));
  expect(1).toBe(1);
});
