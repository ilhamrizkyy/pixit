import { expect, test } from "@playwright/test";
import { dragCells, drawn, openComposer, rect, tapCell } from "./board";

/**
 * The composer's POINTER paths.
 *
 * Everything here is what the Vitest suite structurally cannot check: jsdom has
 * no layout, so a synthetic pointerdown proves a handler ran, not that it ran
 * with the cell the user was over. These run in a real browser against a real
 * production build.
 */

test.describe("drag-fill", () => {
  test("fills the whole rectangle between the two corners", async ({ page }) => {
    const board = await openComposer(page);

    await dragCells(page, board, [2, 2], [[2, 4], [4, 5]]);

    expect(await drawn(page)).toEqual(rect([2, 2], [4, 5]));
  });

  test("shrinks when the pointer comes back toward the origin", async ({ page }) => {
    const board = await openComposer(page);

    // Out to a far corner, then most of the way back WITHOUT releasing. The
    // rectangle is recomputed against the pre-gesture drawing on every sample,
    // so it must give the cells back; building on the running result instead
    // would make a drag a one-way ratchet that keeps everything it touched.
    await dragCells(page, board, [2, 2], [[8, 8], [3, 3]]);

    expect(await drawn(page)).toEqual(rect([2, 2], [3, 3]));
  });

  test("normalises its corners, so up-left covers what down-right covers", async ({ page }) => {
    const board = await openComposer(page);
    await dragCells(page, board, [6, 7], [[3, 3]]);
    const upLeft = await drawn(page);

    await page.getByRole("button", { name: "Undo" }).click();
    await dragCells(page, board, [3, 3], [[6, 7]]);

    expect(await drawn(page)).toEqual(upLeft);
  });

  test("is one undo step, however many cells it covered", async ({ page }) => {
    const board = await openComposer(page);
    await dragCells(page, board, [1, 1], [[5, 6]]);
    expect(await drawn(page)).toHaveLength(30);

    await page.getByRole("button", { name: "Undo" }).click();

    expect(await drawn(page)).toEqual([]);
  });

  test("erases when the gesture starts on a filled cell", async ({ page }) => {
    const board = await openComposer(page);
    await dragCells(page, board, [2, 2], [[6, 6]]);

    // Mode is decided on press: starting inside the block erases.
    await dragCells(page, board, [3, 3], [[5, 5]]);

    const remaining = await drawn(page);
    expect(remaining).toEqual(
      rect([2, 2], [6, 6]).filter((index) => !rect([3, 3], [5, 5]).includes(index)),
    );
  });
});

test.describe("tapping", () => {
  test("fills a cell, and a second tap on it clears", async ({ page }) => {
    const board = await openComposer(page);

    await tapCell(page, board, 5, 5);
    expect(await drawn(page)).toEqual([5 * 11 + 5]);

    await tapCell(page, board, 5, 5);
    expect(await drawn(page)).toEqual([]);
  });

  test("lands on the cell under the pointer, not a neighbour", async ({ page }) => {
    const board = await openComposer(page);

    // Every corner and the centre: a rounding error in the pixel-to-cell map
    // shows up at the edges first, and this is the whole reason these tests
    // need a browser with real layout.
    for (const [row, col] of [[0, 0], [0, 10], [10, 0], [10, 10], [5, 5]]) {
      await tapCell(page, board, row, col);
    }

    expect(await drawn(page)).toEqual([0, 10, 60, 110, 120]);
  });
});

test.describe("slide to clear", () => {
  test("wipes progressively and the wipe survives release", async ({ page }) => {
    const board = await openComposer(page);
    await dragCells(page, board, [0, 0], [[10, 10]]);
    expect(await drawn(page)).toHaveLength(121);

    const groove = page.getByRole("slider", { name: "Slide to clear the drawing" });
    const box = await groove.boundingBox();
    if (box === null) throw new Error("no groove");

    await page.mouse.move(box.x + 8, box.y + box.height / 2);
    await page.mouse.down();
    // Halfway: the left of the drawing should be gone and the right still there.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    const midway = await drawn(page);
    expect(midway.length).toBeGreaterThan(0);
    expect(midway.length).toBeLessThan(121);

    await page.mouse.up();
    // The handle springs back; whatever was wiped stays wiped.
    expect(await drawn(page)).toEqual(midway);
  });
});

test.describe("the knobs", () => {
  test("turn the colour on drag", async ({ page }) => {
    await openComposer(page);
    const hue = page.getByRole("slider", { name: "Hue" });
    const box = await hue.boundingBox();
    if (box === null) throw new Error("no knob");

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const before = Number(await hue.getAttribute("aria-valuenow"));

    // Grab at the top and sweep a quarter turn clockwise.
    await page.mouse.move(cx, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 4, cy, { steps: 12 });
    await page.mouse.up();

    expect(Number(await hue.getAttribute("aria-valuenow"))).not.toBe(before);
  });
});

test.describe("publishing", () => {
  test("copies a registry entry that carries the drawing", async ({
    page,
    context,
    browserName,
  }) => {
    /* Only Chromium implements the clipboard PERMISSIONS, so only there can the
       clipboard be read back. Everywhere else the action still runs and is
       still asserted — via the confirmation it raises — so the code path has
       real coverage on every engine and only the readback is Chromium-only. */
    const canReadClipboard = browserName === "chromium";
    if (canReadClipboard) {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }

    const board = await openComposer(page);

    await dragCells(page, board, [4, 4], [[6, 6]]);
    await page.getByRole("textbox", { name: "Name" }).fill("test-square");
    await page.getByRole("button", { name: "Publish icon" }).click();

    /* "Ready to publish", not "Entry copied" (2026-09-04). The BUTTON says
       `Publish icon` and its three companion strings all named the mechanism it
       hides — "copying its entry", "Entry copied" — so someone who pressed
       Publish with an empty name was told about an "entry" they had never seen
       a word about. The button was right; the strings around it were not. */
    await expect(page.locator('[data-toast="info"]')).toContainText(
      "Ready to publish",
    );
    if (!canReadClipboard) return;

    const entry = await page.evaluate(() => navigator.clipboard.readText());

    expect(entry).toContain("defineIcon({");
    expect(entry).toContain('id: "test-square"');
    expect(entry).toContain('category: "interface"');
    // The art carries the 3x3 block that was actually drawn — the whole point
    // of the loop is that what left the browser is what was on the screen.
    const art = [...entry.matchAll(/^ {6}"(.{11})",$/gm)].map((match) => match[1]);
    expect(art).toHaveLength(11);
    expect(art.join("").split("#").length - 1).toBe(9);
    expect(art[4]).toBe("....###....");
  });

  test("refuses to copy an entry for an id the registry already has", async ({ page }) => {
    const board = await openComposer(page);
    await dragCells(page, board, [4, 4], [[5, 5]]);
    await page.getByRole("textbox", { name: "Name" }).fill("arrow-right");

    await page.getByRole("button", { name: "Publish icon" }).click();

    // An id is immutable once published, so a collision has to be refused
    // rather than suffixed — the same rule Save follows.
    await expect(page.locator('[data-toast="error"]')).toContainText("already in the registry");
  });
});

test.describe("the 3D toy", () => {
  test("renders the screen well in WebGL, and only the screen well", async ({ page }) => {
    await openComposer(page);

    /* ONE CANVAS: the tube's recess. It was four — three lathed knob dials and
       the well — until the scope reskin, and the knobs are KNURLED now. A lathe
       cannot cut knurling, so `KnobMesh` could not describe the part any more
       and went with it; the gallery had never asked for it, so it had no
       consumer left at all.

       ASSERTED AS AN EXACT COUNT, because the failure this guards against is a
       second WebGL context creeping back onto a route that already ships
       three.js for one — and a `toBeGreaterThan` would not see it. */
    const canvases = page.locator("canvas");
    await expect(canvases).toHaveCount(1);

    // This is the only place the 3D is actually SEEN: plain headless Chrome has
    // no WebGL and silently falls back to CSS, so a lathed recess is only ever
    // confirmed here.
    const live = await canvases.evaluateAll((nodes) =>
      nodes.map((node) => {
        const canvas = node as HTMLCanvasElement;
        return canvas.width > 0 && canvas.height > 0;
      }),
    );
    expect(live).toEqual([true]);
  });

  test("keeps the drawing grid in the DOM, not inside a canvas", async ({ page }) => {
    const board = await openComposer(page);

    // CLAUDE.md §5 / INTERACTION.md §8: the 3D must never trap editing. The
    // grid stays an SVG that answers to the keyboard, whatever WebGL is doing
    // underneath it.
    await expect(board).toHaveJSProperty("tagName", "svg");

    await board.focus();
    await page.keyboard.press("Space");
    expect(await drawn(page)).toHaveLength(1);
  });
});

test.describe("the import picker", () => {
  /**
   * A REAL BROWSER, against a real build. The picker's Vitest coverage renders
   * it in jsdom, which cannot catch a store whose actions do not match the code
   * calling them — and that is exactly the failure a stale HMR session produced
   * in dev: `importCells is not a function`, thrown from a store object built
   * by a previous version of the module while React preserved it across the hot
   * update. Nothing was wrong with the source, but nothing in the suite ran the
   * picker in a browser either.
   */
  test("puts the chosen icon's art on the board", async ({ page }) => {
    await openComposer(page);
    expect(await drawn(page)).toEqual([]);

    await page.getByRole("button", { name: "Import icon" }).click();
    const picker = page.getByRole("dialog", { name: "Import icon" });
    await expect(picker).toBeVisible();

    await picker.getByRole("button", { name: "arrow-right", exact: true }).click();

    await expect(picker).toBeHidden();
    // The seed is a horizontal shaft with a two-cell head: 13 filled cells.
    expect((await drawn(page)).length).toBe(13);
    await expect(page.locator('[data-toast="info"]')).toContainText(
      "Imported arrow-right",
    );
  });

  test("searches, and is one undo step away from the board you had", async ({ page }) => {
    await openComposer(page);

    await page.getByRole("button", { name: "Import icon" }).click();
    const picker = page.getByRole("dialog", { name: "Import icon" });
    await picker.getByLabel("Search icons").fill("cloud");
    await expect(picker.getByRole("button", { name: "arrow-right", exact: true })).toHaveCount(0);
    await picker.getByRole("button", { name: "cloud", exact: true }).click();

    const cloud = (await drawn(page)).length;
    expect(cloud).toBeGreaterThan(0);

    // Import COMMITS to history rather than resetting it, so the board comes
    // back. `loadCells` would have left Undo disabled here.
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await drawn(page)).toEqual([]);
  });

  test("closes on Escape without importing", async ({ page }) => {
    await openComposer(page);

    await page.getByRole("button", { name: "Import icon" }).click();
    await expect(page.getByRole("dialog", { name: "Import icon" })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog", { name: "Import icon" })).toBeHidden();
    expect(await drawn(page)).toEqual([]);
  });
});
