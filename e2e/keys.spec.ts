import { expect, test } from "@playwright/test";

/**
 * THE SCREEN'S OWN SELECTORS — paint and pointer behaviour, so Playwright
 * rather than Vitest: jsdom has no layout to measure an overhang against and no
 * computed gradients to read a travelling fill out of.
 *
 * THIS FILE WAS THE SHAPE DRUM'S, AND THE DRUM IS GONE (2026-09-12). Ten tests
 * went with it: the window and grip as separate cut-outs, the barrel moulded in
 * the case's own plastic with its ink inverting against it, the cover's hard
 * reflection edge, the ring of chassis around each opening, the drag that turns
 * the reel and selects no text, the ribs tracking the pointer. Every one of
 * them measured MATERIAL — plastic, glass, a cut through a panel — and the
 * gallery is not made of material any more.
 *
 * WHAT REPLACED IT NEEDS NONE OF THEM, which is the point rather than a
 * shortcut. Shape is three cells in a row now (ShapeCells.tsx): the patches are
 * drawn by the engine's own `cellNode`, so the geometry is the exporter's and
 * cannot drift, and selection is `aria-checked` plus a fill — both of which
 * jsdom can see. `CategoryChips.interaction.test.tsx` covers the radiogroup,
 * the order, all four arrows, the wrap and the focus rule.
 *
 * The two tests left here are the ones that were never about the drum: a name
 * that must overhang its tile, and a fill that must travel.
 */

test("the icon name is shown whole, not clipped to its tile", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByRole("button", { name: /arrow-right/ }).first();
  await card.hover();
  await page.waitForTimeout(300);

  const label = card.locator(".pixl-card-name");
  const { text, scrollW, clientW, boxW, tileW } = await label.evaluate((el) => {
    const tile = el.closest(".pixl-card") as HTMLElement;
    return {
      text: el.textContent ?? "",
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      boxW: el.getBoundingClientRect().width,
      tileW: tile.getBoundingClientRect().width,
    };
  });

  expect(text).toBe("arrow-right");
  // Not truncated: the label's content fits inside the label.
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);
  // And it got there by OVERHANGING the tile rather than by the tile growing —
  // the grid seat is fixed at 64px on purpose.
  expect(boxW).toBeGreaterThan(tileW);
});

/* ---------------------------------------------------------------------------
   The chips — flat, because they are on the glass.
   ------------------------------------------------------------------------ */

/**
 * THE FILL TRAVELS (2026-09-04). It used to be a `background` on the selected
 * chip; it is now ONE capsule behind the row that slides between them, because
 * the board's other tablist already slides and one device should not speak two
 * selection languages.
 *
 * The chip therefore paints no background of its own. That is not an accident
 * to be relaxed: two fills would mean the capsule slides between chips that are
 * already filled, and the travel would be invisible.
 *
 * What the original test protected still holds and is still checked here:
 * exactly one thing is filled, it wears the CATEGORY's own tint rather than a
 * shared accent, the ink never moves between states, and nothing on the glass
 * is moulded.
 */
test("selection is one travelling fill, in the category's own tint", async ({
  page,
}) => {
  await page.goto("/");

  const read = () =>
    page.evaluate(() => {
      const fill = document.querySelector<HTMLElement>(".pixl-chip-fill")!;
      const fillStyle = getComputedStyle(fill);
      return {
        fill: {
          background: fillStyle.backgroundColor,
          box: fill.getBoundingClientRect(),
          // Composited, so a held arrow key retargets instead of restarting.
          transition: fillStyle.transitionProperty,
        },
        chips: [...document.querySelectorAll<HTMLElement>(".pixl-chip")].map(
          (el) => {
            const cs = getComputedStyle(el);
            return {
              // Chips keep a WORD: they are on the glass, and a category has no
              // shape to draw. Only the keys took glyphs.
              label: el.textContent ?? "",
              selected: el.getAttribute("aria-selected") === "true",
              fill: cs.backgroundColor,
              ink: cs.color,
              // Flat by construction — depth belongs to the plastic.
              shadow: cs.boxShadow,
              box: el.getBoundingClientRect(),
            };
          },
        ),
      };
    });

  const transparent = (c: string) =>
    c === "rgba(0, 0, 0, 0)" || c === "transparent";

  /* WAIT FOR THE FILL TO BE PLACED, and this is a race the test used to win by
     accident rather than a thing it was asserting.

     The capsule's position cannot be rendered on the server — it is MEASURED
     off the live chip in a layout effect — so for the frames before that effect
     runs it sits at `translateX(0)` while the chip sits 2px in, on the row's
     own padding. This read used to land after the effect and now lands before
     it: the hero got a full screen of art on 2026-09-13, which is eight more
     SVGs to hydrate ahead of this, and 2px is exactly the row's padding.

     The component writes `width` inline as part of that same effect, so an
     inline width IS the signal that the measurement has happened. Waiting on
     the thing the code actually does beats a sleep, which would be a guess
     about a machine. */
  await page.waitForFunction(() => {
    const fill = document.querySelector<HTMLElement>(".pixl-chip-fill");
    return fill !== null && fill.style.width !== "";
  });

  const before = await read();
  expect(before.chips.length).toBeGreaterThan(3);

  // NOTHING ON THE GLASS IS MOULDED, and no chip paints its own fill.
  for (const chip of before.chips) {
    expect(chip.shadow, `${chip.label} has a moulded face`).toBe("none");
    expect(
      transparent(chip.fill),
      `${chip.label} paints its own fill, so the travel is invisible`,
    ).toBe(true);
  }

  /* IT IS A CAPSULE, NOT A LOZENGE — and that is what forced the build off
     `scaleX`. Scaling a 1px-wide base is the compositor-friendly way to move
     this, and it cannot draw the shape: `border-radius` resolves against the
     UNSCALED box, so the horizontal radius clamps to 0.5px and the scale
     stretches it into an ellipse with pointed ends.

     THE SHAPE CANNOT BE READ BACK FROM CSS, which is why this asserts the
     SCALE instead. Measured against a probe built the old way: a 1px element at
     `scaleX(132)` still reports `border-top-left-radius: 999px`, because the
     computed value is the specified one and not the clamped one. So a radius
     assertion here passes against the exact bug it names — the same class of
     inert check this stylesheet has shipped before. The scale factor is the one
     readable thing that separates the two builds. */
  expect(before.fill.transition).toContain("transform");
  const scaled = await page.evaluate(() => {
    const t = getComputedStyle(
      document.querySelector<HTMLElement>(".pixl-chip-fill")!,
    ).transform;
    return t.includes("matrix") ? Number(t.split(/[(,]/)[1].trim()) : 1;
  });
  expect(
    scaled,
    "the fill is scaled, which clamps its radius and draws a lozenge",
  ).toBe(1);

  // AND IT IS PARKED ON THE LIVE CHIP.
  const selBefore = before.chips.find((c) => c.selected)!;
  expect(Math.abs(before.fill.box.x - selBefore.box.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(before.fill.box.width - selBefore.box.width),
  ).toBeLessThanOrEqual(1);

  const arcadeInk = before.chips.find((c) => c.label === "Arcade")!.ink;
  await page.getByRole("tab", { name: "Arcade" }).click();
  await page.waitForTimeout(400);

  const after = await read();
  const arcadeNow = after.chips.find((c) => c.label === "Arcade")!;

  // IT TRAVELLED, and landed on the chip that is now live.
  expect(arcadeNow.selected).toBe(true);
  expect(Math.abs(after.fill.box.x - arcadeNow.box.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(after.fill.box.width - arcadeNow.box.width),
  ).toBeLessThanOrEqual(1);
  expect(after.fill.box.x).not.toBe(before.fill.box.x);

  // IN ARCADE'S OWN TINT, not a shared accent: the capsule's colour is the live
  // category's, so the fill identifies WHICH rather than meaning "this one".
  const tint = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "pixl-chip-fill";
    probe.setAttribute("data-category", "arcade");
    document.body.append(probe);
    const out = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return out;
  });
  expect(after.fill.background).toBe(tint);
  expect(after.fill.background).not.toBe(before.fill.background);

  // The ink never moved: the tint identifies the category in both states, so
  // nothing about the colour is allowed to mean "this one".
  expect(arcadeNow.ink).toBe(arcadeInk);
});
