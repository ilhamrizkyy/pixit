import { expect, test, type Locator, type Page } from "@playwright/test";
import { openColor } from "./board";

/**
 * The board as an OBJECT: sized to the window, with one scroll inside it.
 *
 * Pure layout, so Playwright rather than Vitest — jsdom has no layout at all,
 * and every assertion here is a measurement.
 *
 * Two properties, both of which were asked for by eye and neither of which any
 * other test would notice losing:
 *
 *   1. The page does not scroll. The device is fully visible and the picture
 *      moves inside the glass. A stray `min-height`, a wrapper that forgets
 *      `min-h-0`, or one more row on the detail bar all break this silently —
 *      the page just gets a scrollbar and nothing fails.
 *   2. The mini screen is SET INTO the chassis. It has been asked for twice and
 *      failed once, and it fails invisibly: the module is near-black, so a
 *      wrong shadow does not look wrong, it just looks like a black rectangle
 *      that happens to be there.
 */

/** Let every entrance finish before measuring anything.
 *
 *  The detail bar enters on a 6px rise, and `boundingBox()` will happily read a
 *  frame partway through it — this test reported the bar 4.3px short of the
 *  screen's bottom edge for exactly that reason, which is a real number
 *  describing nothing. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      ),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]),
  );
}

/**
 * THE HOME PAGE HAS NO NAV BAR (2026-09-13), and its hero carries what the bar
 * carried. This is the reference's shape: phosphoricons.com ships no navigation
 * bar at all, printing every destination in the hero and again in the footer.
 *
 * BOTH HALVES ARE ASSERTED TOGETHER, because either alone is a trap. "No nav"
 * on its own passes just as well if the links were simply lost, which would
 * strand three routes; "the hero has links" on its own passes with a bar still
 * sitting above it, which is the duplication the removal was for.
 */
test("the home page drops the nav bar and the hero carries its links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("header.pixl-hero")).toBeVisible();
  // The footer's own `<nav aria-label="Site">` is deliberately excluded: the
  // claim is about a BAR above the content, not about the word "nav".
  expect(await page.locator("body > nav").count()).toBe(0);

  for (const label of ["Guide", "Resources", "Contribute"]) {
    await expect(
      page.locator(".pixl-hero").getByRole("link", { name: label }),
    ).toBeVisible();
  }

  // And the heading is REAL now. It was `sr-only` for as long as the page was a
  // device, because axe demanded an h1 and a title bar was the one piece of web
  // page a board could not carry.
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toHaveText("Pixit");
});

/**
 * THE HERO FILLS ONE SCREEN, AND IT GROWS RATHER THAN CLIPPING.
 *
 * Both halves, because only together are they safe — and this file has already
 * paid for getting that wrong once. `.pixl-board` carried
 * `height: calc(100dvh - var(--nav-h) - 3rem)` in its `lg` block for a day
 * after the base rule dropped the viewport lock, so the lock never actually
 * lifted on any window wide enough to see it: 508px of enforced white under the
 * grid at 1440x900, and nothing measured it.
 *
 * A `height` fills the screen and CLIPS; a `min-height` fills it and grows. The
 * short-viewport case is the one that separates them, and it is the one a
 * person hits with a large text size or a small laptop.
 */
test("the hero fills one screen and still grows past it", async ({ page }) => {
  await page.goto("/");

  for (const height of [900, 700]) {
    await page.setViewportSize({ width: 1440, height });
    const seen = await page.evaluate(() => {
      const hero = document.querySelector(".pixl-hero")!.getBoundingClientRect();
      const gallery = document
        .querySelector(".pixl-gallery")!
        .getBoundingClientRect();
      return {
        hero: Math.round(hero.height),
        // The grid begins exactly at the fold: the hero is the whole first
        // screen and the gallery is the second.
        galleryTop: Math.round(gallery.top - hero.top),
        viewport: window.innerHeight,
      };
    });
    expect(
      seen.hero,
      `the hero is ${seen.hero}px in a ${height}px window`,
    ).toBeGreaterThanOrEqual(height - 1);
    expect(Math.abs(seen.galleryTop - seen.hero)).toBeLessThanOrEqual(1);
  }

  /* AND IT IS `min-height`. At 320px of window the content cannot fit a screen,
     so a fixed height would clip it and put the links out of reach with no
     scroll to recover them. The hero has to come back TALLER than the viewport
     here, which is the assertion a `height` rule fails. */
  await page.setViewportSize({ width: 1024, height: 320 });
  const squeezed = await page.evaluate(() => ({
    hero: Math.round(document.querySelector(".pixl-hero")!.getBoundingClientRect().height),
    links: Math.round(
      document.querySelector(".pixl-hero-links")!.getBoundingClientRect().bottom,
    ),
  }));
  expect(
    squeezed.hero,
    "the hero clipped its own content instead of growing",
  ).toBeGreaterThan(320);
  expect(squeezed.links).toBeGreaterThan(0);
});

/**
 * THE SIZE CONTROL IS THE SAME WIDTH AT EVERY VALUE, and so is the bar around
 * it.
 *
 * This is the property the meter was rebuilt for on 2026-09-13 and the one a
 * refactor takes away without noticing: a `1fr` column track or a value printed
 * without a reserved width both look correct at the default and reflow the
 * whole row somewhere in the middle of the scale. The scale runs 16 to 120, so
 * the printed number goes from two digits to three — and a control that grows
 * by a character as you drag it pushes everything to its right, including the
 * colour panel you are reading while you drag.
 *
 * Both ends are checked, and so is the NEIGHBOUR: the meter could be static
 * while the value beside it is not, which moves the meter without resizing it.
 */
test("the size control does not change width across its whole scale", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const boxes = () =>
    page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { x: Math.round(rect.x), w: Math.round(rect.width) };
      };
      return {
        slot: box(".pixl-size-slot"),
        meter: box(".pixl-meter"),
        // The control to its right. If anything in the size slot grows, this
        // is what moves.
        hex: box(".pixl-lcd-key"),
      };
    });

  const setSize = (value: number) =>
    page.locator(".pixl-meter input").evaluate((el, v) => {
      const input = el as HTMLInputElement;
      const set = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      set.call(input, String(v));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);

  await setSize(16);
  const small = await boxes();
  await setSize(120);
  const large = await boxes();

  expect(large, "the row reflowed between 16 and 120").toEqual(small);

  /* AND THE BLOCKS ARE ALL ONE SIZE, which is the other half of the request and
     cannot be read off the widths above — a wedge of climbing heights fits in
     exactly the same box. */
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll(".pixl-meter-blocks i")].map((el) => {
      const rect = el.getBoundingClientRect();
      return `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    }),
  );
  expect(blocks.length).toBeGreaterThan(10);
  expect(
    [...new Set(blocks)],
    "the blocks are not all one size",
  ).toHaveLength(1);

  /* AND EACH BLOCK IS A WHOLE NUMBER OF CELLS, read against `--px` rather than
     against a pixel count written here.

     THIS ASSERTION EXISTS BECAUSE THE ONE ABOVE DOES NOT BITE ON ITS OWN.
     Mutation-checked: swapping the fixed column track back to `1fr` leaves the
     blocks equal to each other AND the row the same width at both ends, because
     an auto-width grid of `1fr` columns collapses them all to their (empty)
     content — so every check above passes while the meter is drawn two pixels
     wide. Staticness and size are two different claims and the earlier ones
     only make the first. Ten cells by six is the drawing — LANDSCAPE, which is
     the shape asked for: a row of fourteen portrait blocks reads as a picket
     fence and the eye follows the uprights instead of the run. A fractional
     cell is the one thing this register cannot have, which is why the meter
     buys its width in whole cells rather than stretching a track to fit. */
  const drawn = await page.evaluate(() => {
    const cell = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--px"),
    );
    const rect = document
      .querySelector(".pixl-meter-blocks i")!
      .getBoundingClientRect();
    return { cell, w: rect.width / cell, h: rect.height / cell };
  });
  expect(drawn.cell).toBeGreaterThan(0);
  expect(drawn.w, `a block is ${drawn.w} cells wide`).toBe(10);
  expect(drawn.h, `a block is ${drawn.h} cells tall`).toBe(6);
  expect(
    drawn.w,
    `a block is ${drawn.w}x${drawn.h} cells, which is not landscape`,
  ).toBeGreaterThan(drawn.h);

  // At the top of the scale every block is on; the run is the whole readout.
  const on = await page.locator(".pixl-meter-blocks i.is-on").count();
  expect(on).toBe(blocks.length);
});

/**
 * EVERY CONTROL IN THE BAR SHARES ONE CENTRE LINE.
 *
 * This shipped wrong and nothing caught it. The meter's blocks are 12px of grid
 * inside a box the carets stretch to 28px, so they sat at the TOP of it: every
 * other control centred on one line and the boxes centred 8px above it.
 * Measured at 1440x900, block mid 928 against 936 everywhere else.
 *
 * IT IS INVISIBLE TO EVERY OTHER TEST IN THIS FILE, which is why it gets its
 * own. The heights are right, the widths are right, the controls are all inside
 * the bar, nothing overflows and nothing reflows — a row can pass all of that
 * with one element floating clear of the line the rest sit on. Vertical
 * alignment is only ever caught by comparing centres.
 *
 * The BLOCKS are named separately from the slot that holds them for the same
 * reason: the slot was centred the whole time, and asserting on the slot would
 * have passed against the exact bug.
 */
test("the toolbar's controls all sit on one centre line", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const centres = await page.evaluate(() =>
    Object.fromEntries(
      [
        ".pixl-drop",
        ".pixl-field",
        ".pixl-size-slot",
        ".pixl-size-value",
        ".pixl-meter-blocks",
        ".pixl-meter-key",
        ".pixl-lcd-key",
      ].map((selector) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return [selector, Math.round(rect.top + rect.height / 2)];
      }),
    ),
  );

  const values = [...new Set(Object.values(centres))];
  expect(
    values.length,
    `controls sit on ${values.length} different centre lines: ${JSON.stringify(centres)}`,
  ).toBe(1);
});

/**
 * THE SHAPE KEY DOES NOT RESIZE WHEN ITS VALUE CHANGES, which is the same
 * defect the size value had and in the same row.
 *
 * "Fill" is four characters and "Inset" and "Round" are five, so a key sized to
 * its own content grew by a character when you chose a shape — and since the
 * search field beside it is the bar's only `flex: 1`, that shift propagated
 * across every control to its right. A control must not move the row by being
 * used.
 *
 * The whole row is checked rather than the key alone: the key could hold its
 * width while something inside it reflows what follows.
 */
test("choosing a shape does not move the toolbar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const row = () =>
    page.evaluate(() =>
      [
        ".pixl-drop",
        ".pixl-searchbar",
        ".pixl-size-slot",
        ".pixl-lcd-key",
      ].map((selector) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return `${selector} ${Math.round(rect.x)}+${Math.round(rect.width)}`;
      }),
    );

  const before = await row();

  // Every value, not just one: the longest is what a content-sized key grows
  // to, and Fill is the default and the shortest.
  for (const shape of ["Inset", "Round", "Fill"]) {
    await page.getByRole("button", { name: /^Shape,/ }).click();
    await page.getByRole("menuitemradio", { name: new RegExp(`^${shape}`) }).click();
    await expect(page.getByRole("button", { name: `Shape, ${shape}` })).toBeVisible();
    expect(await row(), `the row moved when Shape became ${shape}`).toEqual(before);
  }
});

/**
 * The art is the set's own icons at size, filling the half of the screen the
 * type does not use — and it is DESKTOP ONLY. A phone hero is one column with
 * no second half, and sprites behind a paragraph at 390px is a texture under
 * text.
 */
test("the hero's art fills the screen beside the type, and never the text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // Dealt in the browser on hydration, so wait for the seats to fill.
  await expect(page.locator(".pixl-hero-sprite")).toHaveCount(6);

  const seen = await page.evaluate(() => {
    // The real INK extent of the type, via a Range — the blocks themselves span
    // the full body width, so their boxes say nothing about where the text
    // actually ends.
    const inkRight = (selector: string) => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(selector)!);
      return range.getBoundingClientRect().right;
    };
    const hero = document.querySelector(".pixl-hero")!.getBoundingClientRect();
    const sprites = [
      ...document.querySelectorAll<HTMLElement>(".pixl-hero-sprite"),
    ].map((s) => s.getBoundingClientRect());
    return {
      count: sprites.length,
      clearance: Math.round(
        Math.min(...sprites.map((s) => s.left)) -
          Math.max(inkRight(".pixl-hero-mark"), inkRight(".pixl-hero-line")),
      ),
      // How much of the hero's height the constellation actually covers. The
      // art was a child of the BODY for one pass, whose box is only as tall as
      // four lines of type — so the sprites sat in a 430px band in the middle
      // of a 900px screen and both thirds outside it stayed empty.
      coverage:
        (Math.max(...sprites.map((s) => s.bottom)) -
          Math.min(...sprites.map((s) => s.top))) /
        hero.height,
      /* BLEEDING OFF IS THE COMPOSITION (2026-09-15), which is phosphoricons.com's:
         big pieces cropped by the screen's edge. What must not happen is a
         piece hanging off the LEFT, into the type's side, or one entirely
         off screen, which would be decoration nobody can see. */
      spills: sprites.filter(
        (s) => s.left < hero.left + hero.width / 2 - 80 || s.bottom < hero.top || s.top > hero.bottom || s.left > hero.right,
      ).length,
      bleeds: sprites.filter((s) => s.top < hero.top || s.bottom > hero.bottom || s.right > hero.right).length,
    };
  });

  expect(seen.count).toBeGreaterThan(4);
  expect(
    seen.clearance,
    `the art begins ${seen.clearance}px from the type`,
  ).toBeGreaterThan(60);
  expect(
    seen.coverage,
    `the art covers ${(seen.coverage * 100).toFixed(0)}% of the hero's height`,
  ).toBeGreaterThan(0.6);
  expect(seen.spills, "a sprite is off screen or on the type's side").toBe(0);
  expect(seen.bleeds, "no piece bleeds off the screen's edge").toBeGreaterThan(0);

  // Below `lg` it is not rendered at all.
  await page.setViewportSize({ width: 390, height: 800 });
  expect(
    await page.locator(".pixl-hero-sprite").first().isVisible(),
  ).toBe(false);
});

/**
 * The bar itself survives on every route that has no hero — see SiteNav.tsx for
 * why that is the rule rather than "no bar anywhere". Checked on `/guide`,
 * which is where it now lives.
 */
test("the nav is a page, not part of the device", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/guide");

  const nav = await page.evaluate(() => {
    const bar = document.querySelector("body > nav")!;
    const link = bar.querySelector<HTMLElement>('a[aria-current="page"]')!;
    // Resolve the shell's accent through a throwaway element, so both sides of
    // the comparison come back in the same serialisation: reading the custom
    // property gives the authored hex, and a computed `color` is always
    // `rgb(...)`. Mounted on the ROOT, deliberately — anywhere inside the nav
    // would inherit a repointed `--color-accent` and the test would compare the
    // toy's blue with itself and pass.
    const probe = document.createElement("span");
    probe.style.color = "var(--color-accent)";
    document.documentElement.append(probe);
    const shellAccent = getComputedStyle(probe).color;
    probe.remove();

    return {
      image: getComputedStyle(bar).backgroundImage,
      fill: getComputedStyle(bar).backgroundColor,
      linkInk: getComputedStyle(link).color,
      shellAccent,
    };
  });

  // It wore the chassis for one iteration — a moulded brow with a gradient, a
  // grain and the toy's own token repointing. Plain shell now: a flat fill, no
  // gradient and no grain, and the SHELL's accent on the active link, so a nav
  // item is the same blue here as it is on Guide.
  expect(nav.image).toBe("none");
  expect(nav.fill).not.toBe("rgba(0, 0, 0, 0)");
  expect(nav.linkInk).toBe(nav.shellAccent);
});

/**
 * THE HEX READOUT PRINTS IN CAPITALS, AND ON THE LAYER THAT PAINTS.
 *
 * `text-transform: uppercase` sat on `.pixl-lcd-input` for weeks — an element
 * whose text is deliberately TRANSPARENT, because the glyphs are drawn by an
 * overlay above it and the input contributes nothing but a caret. So the rule
 * uppercased text nobody could see, the panel read `#ffffff`, and a declaration
 * saying otherwise sat two rules below it in the same file.
 *
 * That is the third time this stylesheet has lost a declaration to the wrong
 * element or an unresolved `var()`, so this reads the RENDERED text rather than
 * the property: a rule that is present and inert passes a `toHaveCSS` check
 * perfectly.
 */
test("the hex readout prints its letters in capitals", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  /* TYPED, NOT INHERITED FROM THE THEME (2026-09-13). This used to force
     `pixle-theme: dark` and lean on dark's #ffffff default, and that no longer
     works in either direction: the colour is seeded from the OS rather than
     from the theme, and the THEME is now derived from the colour — so a stored
     preference on `/` is overwritten the moment the gallery mounts.

     Typing the value is also the better test. It needs six letters and no
     digits to prove the transform, and reaching that through a theme default
     made the assertion depend on two rules instead of the one under test. */
  const panel = await openColor(page);
  const field = panel.getByLabel("Icon color, as a hex value");
  await field.fill("ffffff");
  await expect(field).toHaveValue("ffffff");

  const shown = await page.evaluate(() => {
    const digits = document.querySelector(".pixl-lcd-digits")!;
    return {
      // What the overlay actually paints, per character.
      text: (digits.textContent ?? "").trim(),
      transform: getComputedStyle(digits).textTransform,
      // The input is transparent: whatever it says, nobody reads it.
      inputInk: getComputedStyle(document.querySelector(".pixl-lcd-input")!)
        .color,
    };
  });

  expect(shown.transform).toBe("uppercase");
  expect(shown.inputInk).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);

  /* THE VALUE STAYS AS TYPED. The capitals are a `text-transform`, not a
     transform of the state — ColorKnobs.interaction.test.tsx pins the other
     half of that, and doing it in JS instead would fight the caret. */
  await field.fill("aabbcc");
  await expect(field).toHaveValue("aabbcc");
  expect(
    await page.locator(".pixl-lcd-digits").evaluate((el) => el.textContent),
  ).toBe("aabbcc");
});

/**
 * AND ITS BEZEL IS EVEN ON ALL FOUR SIDES.
 *
 * The thicker bottom band was not decoration hung on the frame — it was 32px of
 * bezel that existed BECAUSE something was printed on it, which is why the
 * module carried no bottom padding of its own. Once the printing went, a fat
 * chin under a clean screen is the unfinished side the board's own badge exists
 * to answer, so the band went with it and the 32px went back to the glass.
 *
 * Measured as GEOMETRY rather than as a padding string: the failure this
 * catches is the asymmetry coming back by some other route — a margin on the
 * glass, a leftover band, a border on one edge — and a computed `padding` would
 * report 10px on all four sides through every one of them.
 */
test("the mini screen's bezel is even on all four sides", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await selectIcon(page);

  const gaps = await page.evaluate(() => {
    const body = document.querySelector(".pixl-mini-body")!.getBoundingClientRect();
    const glass = document.querySelector(".pixl-mini-glass")!.getBoundingClientRect();
    return {
      top: glass.top - body.top,
      right: body.right - glass.right,
      bottom: body.bottom - glass.bottom,
      left: glass.left - body.left,
    };
  });

  const sides = Object.values(gaps);
  // A real bezel, not a hairline — this also fails if the module collapses.
  expect(Math.min(...sides), `bezel gaps ${JSON.stringify(gaps)}`).toBeGreaterThan(4);
  // And even: the widest side within a pixel of the narrowest.
  expect(
    Math.max(...sides) - Math.min(...sides),
    `bezel gaps ${JSON.stringify(gaps)}`,
  ).toBeLessThanOrEqual(1);
});

/**
 * THE MINI SCREEN'S GLASS IS SQUARE, AND HAS TO BE.
 *
 * Its `aspect-ratio: 1` is a BASIS, not a lock — the glass gives up height on a
 * short window rather than the board growing past the viewport. Which means
 * that letting it GROW is silently wrong in the other direction: it stretches
 * into a portrait screen and the 11x11 lattice letterboxes in the middle of it,
 * so the picture does not get any bigger and the screen stops looking like one.
 * That is exactly what happened the one time the column's spare height was
 * handed to it.
 */
test("the mini screen's glass stays square when there is height to spare", async ({
  page,
}) => {
  // Deliberately TALL: the failure only appears when there is slack to give.
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await selectIcon(page);

  const glass = (await page.locator(".pixl-mini-glass").boundingBox())!;
  expect(glass.height / glass.width).toBeCloseTo(1, 1);
});

test("the whole hex readout is a text field, not a 7ch slot in one", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const panel = await openColor(page);

  /* SCOPED TO THE POPOVER, because `.pixl-lcd` now matches TWO things: the
     readout in here and the colour KEY in the bar that opens it, which took the
     same segment panel on 2026-09-13. A bare locator resolved to the key — a
     button — and this test would have been clicking the thing it just used to
     open the thing it meant to test. */
  const lcd = (await panel.locator(".pixl-lcd").boundingBox())!;

  // Click in the DEAD SPACE past the six digits — right of the value, left of
  // the "HEX" unit. The input was sized to its content, so most of a 264px
  // panel looked like somewhere you could click and did nothing when you did.
  await page.mouse.click(lcd.x + lcd.width * 0.6, lcd.y + lcd.height / 2);

  const focused = await page.evaluate(
    () => document.activeElement?.getAttribute("aria-label") ?? null,
  );
  expect(focused).toBe("Icon color, as a hex value");
});

/**
 * The knob FOLLOWS the chassis and the LCD inverts with it — two different
 * rules, and the difference is what each part IS. A knob is moulded in the
 * case's own plastic, so it takes the case's tone; the ink and the panel behind
 * the art exist to be read AGAINST the case, so they take its opposite.
 *
 * Neither is checked anywhere else. A knob that stopped following is a white
 * disc on a near-white panel (which is what it was), and axe can see neither —
 * one is a gradient, the other is art.
 */
/**
 * Put an icon on the mini screen.
 *
 * THE SCREEN ONLY EXISTS WHILE SOMETHING IS SELECTED as of 2026-09-12: it moved
 * out of the board's left column and into the detail shelf, so it appears and
 * leaves with everything else that describes the chosen icon. Every test that
 * measures the panel has to load one first — they used to find it mounted and
 * idle at page load.
 */
async function selectIcon(page: Page) {
  await page.locator('[aria-label="Icons"] button').first().click();
  await page.locator(".pixl-mini-glass").waitFor();
  await settle(page);
}

async function paint(
  page: Page,
  selector: string,
  prop: "background" | "color",
) {
  return page.evaluate(
    ([sel, which]) => {
      const cs = getComputedStyle(document.querySelector(sel)!);
      const source =
        which === "color" ? cs.color : cs.backgroundImage + cs.backgroundColor;
      // OPAQUE STOPS ONLY. The LCD carries a glass sheen over it — white at 3%
      // and 14% — and a parser that drops the alpha counts those as pure white
      // and reports the panel a third brighter than it paints. This test read
      // 3.1:1 on a panel that actually measures 9:1 for exactly that reason.
      const opaque = (c: number[]) =>
        c.every((v) => Number.isFinite(v)) &&
        (c[3] === undefined || c[3] > 0.999);
      const stops = [
        ...[...source.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => {
          const parts = m[1].split(/[,\s/]+/).map(Number);
          return [
            ...parts.slice(0, 3).map((v) => v / 255),
            ...parts.slice(3, 4),
          ];
        }),
        ...[...source.matchAll(/color\(srgb ([^)]+)\)/g)].map((m) =>
          m[1]
            .trim()
            .split(/[\s/]+/)
            .map(Number),
        ),
      ]
        .filter(opaque)
        .map((c) => c.slice(0, 3));
      const flat = stops.flat();
      return {
        level: flat.reduce((a, b) => a + b, 0) / flat.length,
        // Mean per-channel, for judging a colour cast.
        rgb: [0, 1, 2].map(
          (i) => stops.reduce((a, c) => a + c[i], 0) / stops.length,
        ) as [number, number, number],
      };
    },
    [selector, prop] as const,
  );
}

/* THE TWO CSS-KNOB TESTS WENT ON 2026-09-12, and what they covered is worth
 * knowing rather than quietly losing.
 *
 * They held two rules the DESIGN.md §6 note about drifting builds exists for:
 * that a knob is moulded in the case's own plastic and so FOLLOWS the chassis
 * while its pip inverts against the DIAL, and that only the pip turns — a
 * surface of revolution spinning about its own axis does not change how it is
 * lit, which the mesh gets for free from a real lathe and a CSS gradient faking
 * the solid had to be told.
 *
 * They ran on `/`, because the gallery deliberately does not ship three.js and
 * its three H/S/L knobs were therefore always the CSS build. Those knobs are
 * gone — colour is a 2D field now — and moving the tests to `/create` does not
 * work: the composer renders `KnobMesh`, so `.toy-knob-dial` and
 * `.toy-knob-spin` do not exist there at all.
 *
 * SO THE CSS KNOB BUILD HAS NO DEFAULT SURFACE LEFT. It is reachable only as
 * the `useWebGL() === false` fallback, which needs WebGL disabled to test.
 * Restoring coverage means either forcing that fallback in a dedicated project
 * or waiting for the composer rebuild, which is where `design-plans/reserved/`
 * sends these knobs anyway. Recorded there too.
 */


for (const theme of ["light", "dark"] as const) {
  test(`both boards draw on the SAME panel — ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    /* THE OS IS THE ONLY THEME SOURCE (2026-09-13). This forced a stored
       `pixle-theme` until the toggle was removed and the whole storage layer
       went with it — a preference nobody can revise is a stuck state, not a
       preference. `emulateMedia` drives the same rule the stylesheet actually
       reads, which is what the test meant all along. */
    await page.emulateMedia({ colorScheme: theme });

    /* THE STORED PREFERENCE HOLDS ON `/` AGAIN (2026-09-13). It did not for a
       day, while the page theme was derived from the icon colour and the
       gallery overwrote whatever was stored the moment it mounted. The ground
       is scoped to the gallery REGION now, so the page keeps the theme it was
       given and the region follows the colour — and since the colour's own
       default follows the theme, asking for dark still gets a dark panel here
       without a second step. */
    await page.goto("/");
    await selectIcon(page);
    const mini = await paint(page, ".pixl-mini-glass", "background");

    await page.goto("/create");
    const toy = await paint(page, ".toy-screen", "background");

    // ONE PART, ONE MATERIAL. The composer's screen was `--screen` — the icon
    // grid's LIT display — so it flipped from near-white to near-black with the
    // theme, which is a violent change for the one surface you draw on. It is
    // the same segment panel as the gallery's mini screen now, and nothing else
    // would notice if that quietly came apart again: two routes, two
    // stylesheets' worth of rules, and no shared component between them.
    expect(Math.abs(toy.level - mini.level)).toBeLessThan(0.06);
    // Sage on both, not merely the same lightness.
    expect(toy.rgb[1]).toBeGreaterThan(toy.rgb[0]);
    expect(toy.rgb[1]).toBeGreaterThan(toy.rgb[2]);
  });
}

/**
 * THE SHELF FLOATS AT THE FOOT OF THE SCREEN (2026-09-15). It sat in flow under
 * the grid, and once the set grew to 108 icons that was 1,500px below the icon
 * you had just clicked, so selection opened a shelf nobody could see.
 * `toBeVisible` passed the whole time, because it does not care whether an
 * element is inside the viewport: this measures that it is.
 *
 * And the other half of choosing sticky over fixed: at the end of the page the
 * shelf settles below the grid, so the last tile is never trapped under it.
 */
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`choosing an icon floats the shelf on screen (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".pixl-card").first().click();
    const bar = page.locator(".pixl-detailbar");
    await expect(bar).toBeVisible();

    await expect
      .poll(async () => {
        const box = (await bar.boundingBox())!;
        return box.y >= 0 && box.y + box.height <= viewport.height + 1;
      }, { message: "the shelf should sit inside the viewport" })
      .toBe(true);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(async () => {
        const last = (await page.locator(".pixl-card").last().boundingBox())!;
        const box = (await bar.boundingBox())!;
        return last.y + last.height <= box.y + 1;
      }, { message: "at the end of the page the last tile should clear the shelf" })
      .toBe(true);
  });
}

/**
 * THE DETAIL BAR HAS A HIERARCHY, AND IT IS CARRIED BY FILL (2026-09-03).
 *
 * It was four identically bordered boxes in a row: Copy SVG, which is what
 * almost everyone came for, looked exactly like Copy name. Four boxes alike
 * state that all four matter equally.
 *
 * FILL, NOT CHROME, because this is inside the glass and the board's rule is
 * that depth belongs to the plastic — anything drawn on a display is drawn
 * (§1). An inverse block is what a monochrome display does to say "this one",
 * and it costs no colour.
 *
 * AND NOT THE ACCENT. The selected CARD wears `--accent` on this same screen;
 * a filled accent button two inches below it would be the one colour that means
 * "this one" saying it about two different things at once. That is the
 * regression this guards — accent is one `background` declaration away.
 */
test("the detail shelf's primary action is filled, and the tabs are not", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const bar = await page.evaluate(() => {
    const parse = (v: string) => {
      const srgb = /color\(srgb ([^)]+)\)/.exec(v);
      if (srgb !== null) {
        const parts = srgb[1].trim().split(/[\s/]+/).map(Number);
        return [...parts.slice(0, 3).map((n) => n * 255), parts[3] ?? 1];
      }
      const parts = v.replace(/[^\d,.]/g, "").split(",").map(Number);
      return [...parts.slice(0, 3), parts[3] ?? 1];
    };
    const token = (name: string) => {
      const probe = document.createElement("span");
      probe.style.color = getComputedStyle(
        document.documentElement,
      ).getPropertyValue(name);
      document.documentElement.append(probe);
      const out = parse(getComputedStyle(probe).color);
      probe.remove();
      return out;
    };
    const primary = document.querySelector(".pixl-panel-primary")!;
    const rest = [...document.querySelectorAll(".pixl-format")];
    const read = (el: Element) => {
      const cs = getComputedStyle(el);
      return {
        fill: parse(cs.backgroundColor),
        ink: parse(cs.color),
        border: cs.borderTopWidth,
      };
    };
    return {
      primary: read(primary),
      rest: rest.map(read),
      accent: token("--color-accent"),
      ground: parse(getComputedStyle(document.querySelector(".pixl-detailbar")!).backgroundColor),
    };
  });

  // THE PRIMARY IS FILLED, opaquely.
  expect(bar.primary.fill[3], "the primary is not filled").toBe(1);

  // AND IT IS INVERSE — its fill is on the far side of the bar from its ink,
  // which is the whole of what an inverse block is.
  const linear = (v: number) =>
    v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
  const lum = ([r, g, b]: number[]) =>
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const ground = lum(bar.ground);
  expect(
    Math.sign(lum(bar.primary.fill) - ground),
    "the primary's fill does not invert against the bar",
  ).toBe(-Math.sign(lum(bar.primary.ink) - ground));

  /* "NOT THE ACCENT" WENT ON 2026-09-12, with the accent itself. This asserted
     the primary's fill was 60-plus channel-steps away from `--color-accent`, so
     the one filled thing on the shelf could not be saying what a selected card
     already says. The palette is monochrome now — `--color-accent` IS the ink —
     so the test could only ever fail, and the rule it protected has nothing
     left to protect: there is no second colour for two things to collide on.

     What still holds is the inverse-block check above, which is the stronger
     half anyway: it measures the RELATIONSHIP between fill, ink and ground
     rather than naming a colour, so it survives a palette change instead of
     being invalidated by one. */

  /* AND THE OTHERS CARRY NO CHROME AT ALL — no fill, no border. Both are
     checked: the four bordered boxes came back as easily as they went. */
  /* AND THE FORMAT TABS CARRY NO FILL AT ALL. A tab is a printed label with a
     rule under the live one — the chips' own trick next door, mass instead of
     depth. A filled tab would be a second thing on this shelf claiming to be
     the primary action. */
  expect(bar.rest.length, "no format tabs found").toBeGreaterThan(1);
  for (const tab of bar.rest) {
    expect(tab.fill[3], "a format tab is filled").toBe(0);
  }
});

/**
 * THE SHELF'S MOTION — three things, and each replaces a cut with a move.
 *
 * 1. THE LIVE TAB'S RULE SLIDES. It was a `border-bottom` on whichever tab was
 *    selected, so switching format repainted two tabs and the rule teleported.
 *    As one element the strip can tween it, which is the transitions.dev
 *    tabs-sliding mechanism with a rule where the recipe paints a pill.
 * 2. IT IS PLACED WITHOUT A TRANSITION ON FIRST PAINT. The recipe's own listed
 *    mistake: without suspending the transition for the first write, the rule
 *    animates in from zero width at the left edge every time an icon is picked.
 * 3. THE MENU IS HELD FOR ITS CLOSE, and NOT held for anyone who asked for less
 *    motion. A surface that unmounts on close has nothing to animate on, and
 *    making a reduced-motion user sit through a delay they cannot see is worse
 *    than no animation at all.
 */
test("the format rule slides between tabs rather than jumping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const rule = page.locator(".pixl-format-rule");
  const first = page.getByRole("tab", { name: "SVG" });
  const last = page.getByRole("tab", { name: "Data URI" });

  /* 2. ON THE LIVE TAB THE MOMENT THE SHELF EXISTS — same left edge, same
        width. A rule that animated in would be narrower than its tab here. */
  const startTab = (await first.boundingBox())!;
  const start = (await rule.boundingBox())!;
  expect(Math.abs(start.x - startTab.x), "the rule is not on the live tab").toBeLessThanOrEqual(1);
  expect(
    Math.abs(start.width - startTab.width),
    "the rule did not take the tab's width on first paint",
  ).toBeLessThanOrEqual(1);

  // 1. AND IT IS IN BETWEEN MID-FLIGHT, which a jump never is.
  const target = (await last.boundingBox())!;
  await last.click();
  await page.waitForTimeout(90);
  const mid = (await rule.boundingBox())!;
  expect(
    mid.x,
    `mid-slide ${mid.x} is not past the start ${start.x}`,
  ).toBeGreaterThan(start.x + 4);
  expect(
    mid.x,
    `mid-slide ${mid.x} already reached the target ${target.x}`,
  ).toBeLessThan(target.x - 4);

  // And it lands ON the tab, not near enough. A pixel of slack for the
  // sub-pixel rounding `offsetLeft` does against a fractional bounding box.
  await expect
    .poll(async () => Math.abs((await rule.boundingBox())!.x - target.x))
    .toBeLessThanOrEqual(1);
});

/**
 * THE SOURCE HUGS ITS CONTENT, and the SHELF is what absorbs it.
 *
 * It was capped at 7rem with `overflow: auto`, which put a scroll region
 * inside a shelf that sits inside the one scrolling thing on the page — three
 * nested scrolls to read twelve lines of markup. Uncapped, the shelf takes the
 * height each format needs and the GRID gives it up, which is the trade the
 * grid already exists to make.
 *
 * THE SECOND HALF OF THIS TEST IS GONE (2026-09-13), and it is worth saying why
 * rather than just deleting it. It asserted that the gallery still fitted the
 * window at every format, because "a block that hugs inside a board that cannot
 * shrink is a board that overflows the window" — and the premise was the
 * viewport lock. The page scrolls now, so a shelf that makes the gallery taller
 * than the window is the page doing exactly what a page does. Keeping the
 * assertion would have pinned a constraint that no longer exists, which is
 * worse than having no assertion at all.
 *
 * Every format is walked, since they differ by a factor of three — an SVG is
 * ~90px of markup and a CSS rule carrying the same art as a data URI is ~280.
 */
test("the source block hugs every format", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const heights: number[] = [];
  for (const tab of ["SVG", "React", "HTML", "CSS", "Data URI"]) {
    await page.getByRole("tab", { name: tab }).click();

    const seen = await page.evaluate(() => ({
      // NOT A SCROLL REGION: the rendered box is the content's own height.
      overflow: (() => {
        const pre = document.querySelector(".pixl-code-text")!;
        return pre.scrollHeight - pre.clientHeight;
      })(),
      shelf: document
        .querySelector(".pixl-detailbar")!
        .getBoundingClientRect().height,
    }));

    expect(seen.overflow, `${tab} scrolls inside the block`).toBeLessThanOrEqual(1);
    heights.push(seen.shelf);
  }

  /* AND THE SHELF ACTUALLY MOVED. If the block had silently kept a cap, every
     format would come back the same height and each assertion above would pass
     on a fixed box. */
  expect(
    Math.max(...heights) - Math.min(...heights),
    "every format produced the same shelf height, so the block is still capped",
  ).toBeGreaterThan(40);
});

/**
 * THE TWO COPY BUTTONS ARE ONE FAMILY IN TWO WEIGHTS (2026-09-03).
 *
 * The shelf offers Copy twice on purpose — once at the foot of the identity
 * column and once within reach of the source it copies. For one pass they were
 * two different OBJECTS: a filled capsule and a small square-cornered chip, in
 * different paddings and different type. Two vocabularies for one action.
 *
 * What must match is the SHAPE and the TYPE; what must differ is the FILL,
 * because only one of them is the primary. Both directions are asserted: made
 * identical, the shelf would carry two primaries.
 */
test("the shelf's two Copy buttons are one control in two weights", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const pair = await page.evaluate(() => {
    const read = (sel: string) => {
      const cs = getComputedStyle(document.querySelector(sel)!);
      return {
        radius: cs.borderTopLeftRadius,
        font: `${cs.fontFamily}/${cs.fontSize}`,
        padY: cs.paddingTop,
        fill: cs.backgroundColor,
      };
    };
    return { primary: read(".pixl-split-main"), block: read(".pixl-code-copy") };
  });

  // SAME OBJECT: shape, type and padding come from the one class.
  expect(pair.block.radius, "the two Copy buttons are different shapes").toBe(
    pair.primary.radius,
  );
  expect(pair.block.font, "the two Copy buttons are set differently").toBe(
    pair.primary.font,
  );
  expect(pair.block.padY, "the two Copy buttons are different sizes").toBe(
    pair.primary.padY,
  );

  // TWO WEIGHTS: one is filled and one is not.
  expect(
    pair.block.fill,
    "both Copy buttons are filled, so the shelf has two primaries",
  ).not.toBe(pair.primary.fill);
});

/**
 * THE SEARCH FIELD IS A CUT WITH A REAL BOUNDARY, AND FOCUS ADDS TO IT.
 *
 * Two rules, one element, and both had been broken since before the board was
 * built — this field was the last piece of the pre-board design still in place.
 *
 * 1. FOCUS ADDS ITS RING TO THE STACK. DESIGN.md §5c records fixing exactly this
 *    on `.pixl-well`: swapping the whole `box-shadow` is how focusing a field
 *    flattens the hole. `.pixl-field` never got the fix, so clicking in dropped
 *    the boundary line entirely.
 * 2. THE BOUNDARY CARRIES THE FIELD, NOT THE FILL. Anything on a display is
 *    drawn, so this gets a real line rather than a deep fake recess. It measured
 *    1.27:1 against the screen where WCAG 1.4.11 asks 3:1 for a control
 *    boundary, and the fill inside it 1.10:1 light and 1.06:1 dark.
 */
for (const theme of ["light", "dark"] as const) {
  test(`the search field keeps its boundary when focused (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    /* THE OS IS THE ONLY THEME SOURCE (2026-09-13). This forced a stored
       `pixle-theme` until the toggle was removed and the whole storage layer
       went with it — a preference nobody can revise is a stuck state, not a
       preference. `emulateMedia` drives the same rule the stylesheet actually
       reads, which is what the test meant all along. */
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");

    const field = page.locator(".pixl-field");
    const stack = async () =>
      field.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          shadow: cs.boxShadow
            .split(/,(?![^(]*\))/)
            .map((layer) => layer.trim()),
          border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
          width: parseFloat(cs.borderTopWidth),
        };
      });

    const resting = await stack();

    /* THE BOUNDARY IS A REAL BORDER as of 2026-09-12, not an inset line
       pretending to be one. It was `inset 0 0 0 1px var(--screen-field-line)`
       under a shallow recess shadow — a field cut into a display, which is what
       the board's glass called for and is nothing like the register the page
       carries now. So this asserts a border rather than a shadow layer, and the
       rule it protects is unchanged. */
    expect(resting.width, "the field has no border").toBeGreaterThanOrEqual(2);

    await page.locator(".pixl-field input").focus();
    const focused = await stack();

    /* 1. FOCUS ADDS, IT DOES NOT REPLACE. This is the defect DESIGN.md §5c
       records fixing on `.pixl-well` and then shipping anyway in this one
       field, where focusing swapped the whole `box-shadow` and dropped the
       boundary the instant you clicked in. Both halves are checked: the border
       survives, and every resting shadow layer is still in the stack with the
       ring added on top. */
    expect(focused.border, "focusing changed the field's border").toBe(
      resting.border,
    );
    for (const layer of resting.shadow) {
      if (layer === "none") continue;
      expect(
        focused.shadow,
        `focusing dropped a resting layer: ${layer}`,
      ).toContain(layer);
    }
    expect(
      focused.shadow.length,
      "focus did not add a ring",
    ).toBeGreaterThan(resting.shadow.filter((l) => l !== "none").length);

    // 2. THE BOUNDARY CLEARS 3:1 AGAINST THE SCREEN BEHIND IT (1.4.11).
    const ratio = await page.evaluate(() => {
      const parse = (v: string) => {
        const n = v.match(/-?[\d.]+/g)!.map(Number);
        // `color(srgb r g b / a)` channels are 0..1; `rgb()` are 0..255.
        return v.startsWith("color(")
          ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1]
          : [n[0], n[1], n[2], n[3] ?? 1];
      };
      const lin = (c: number) =>
        c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4;
      const lum = (c: number[]) =>
        0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);

      const field = document.querySelector(".pixl-field")!;
      const line = parse(getComputedStyle(field).borderTopColor);
      const screen = parse(
        getComputedStyle(document.querySelector(".pixl-bar")!).backgroundColor,
      );
      const a = lum(line);
      const b = lum(screen);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(
      ratio,
      `the field's boundary is ${ratio.toFixed(2)}:1 against the screen, under 1.4.11's 3:1`,
    ).toBeGreaterThanOrEqual(3);
  });
}

/**
 * THE GALLERY CAN SHOW A REFUSAL, AND FOR A LONG TIME IT COULD NOT.
 *
 * It held the toast as a bare string and rendered `<Toast>` with no `tone`, so
 * everything defaulted to `info` — while the copy path sends real refusals
 * through the same channel. "Could not copy" arrived bottom-centre,
 * `role="status"`, for 2.2 seconds, where INTERACTION.md §7 asks for
 * top-centre, `role="alert"`, for 4.5. The composer had done this correctly
 * since it was built; the public route, which almost all traffic lands on, had
 * no error path at all.
 *
 * The clipboard is stubbed to fail rather than mocked away, so this exercises
 * the real refusal branch.
 */
test("a refused copy is an ALERT at the top, not an ambient confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    // Both routes `copyText` can take, so the fallback cannot quietly succeed.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("blocked")) },
    });
    document.execCommand = () => false;
  });
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  await page.getByRole("button", { name: "Copy SVG" }).click();

  const toast = page.locator("[data-toast]");
  await expect(toast).toBeVisible();
  await expect(toast, "a refusal is delivered as a confirmation").toHaveAttribute(
    "data-toast",
    "error",
  );
  await expect(toast, "a refusal does not interrupt").toHaveAttribute(
    "role",
    "alert",
  );

  // AND IT TAKES THE TOP, clear of the shelf it is about.
  const box = (await toast.boundingBox())!;
  expect(
    box.y,
    "the refusal sits in the confirmation's corner",
  ).toBeLessThan(900 / 2);
});

/**
 * AN IDENTICAL REPEATED MESSAGE IS A NEW TOAST (INTERACTION.md §7).
 *
 * The gallery held the toast as a bare string, so `setToast("SVG copied")`
 * twice in a row was a no-op in React state: the second copy produced no new
 * toast, no second announcement, and the first toast's clock kept running from
 * the first press. Copying twice looked like the first confirmation had simply
 * never left. The composer solved this with a nonce; the gallery never got one.
 */
test("copying twice restarts the toast rather than leaving the first standing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const copy = page.getByRole("button", { name: "Copy SVG" });
  const toast = page.locator("[data-toast]");

  await copy.click();
  await expect(toast).toBeVisible();
  // A stamp on the node itself: if React reuses the element, this survives.
  await toast.evaluate((el) => el.setAttribute("data-probe", "first"));

  // Let the first one age, then send the identical message again.
  await page.waitForTimeout(600);
  await copy.click();
  await expect(toast).toBeVisible();

  await expect(
    toast,
    "the second copy reused the first toast, so its clock never restarted",
  ).not.toHaveAttribute("data-probe", "first");
});

/**
 * COPY FEEDBACK BELONGS TO THE BUTTON THAT WAS PRESSED.
 *
 * The shelf offers Copy twice on purpose — the filled primary at the foot of
 * the identity column, and the same control in its outlined weight in the
 * source block's corner. They read one shared label, so pressing either one
 * turned BOTH to "Copied": a button reporting an action nobody took on it, a
 * whole column away from the press.
 *
 * Checked in both directions, because a fix that attributes one and not the
 * other is the same bug with a smaller blast radius.
 */
test("each Copy button reports its own press, not the other's", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const primary = page.locator(".pixl-split-main");
  const block = page.locator(".pixl-code-copy");

  /* BOTH LABELS READ AT ONE INSTANT, and that is the whole test.

     Written with two `toHaveText` calls it passes against the bug it names:
     the feedback clears itself after 1.6s, and a web-first assertion RETRIES
     for five. So "the other button is still at rest" became true on its own
     before the assertion gave up, and a mutation restoring the shared label
     sailed through. A self-healing state cannot be checked with a retrying
     matcher. */
  const bothAfter = async (press: () => Promise<void>, pressed: Locator) => {
    await press();
    // The clipboard write is async: wait for the pressed button only.
    await expect(pressed).toHaveText(/Copied|Could not copy/);
    return page.evaluate(() => ({
      primary: document.querySelector(".pixl-split-main")?.textContent?.trim(),
      block: document.querySelector(".pixl-code-copy")?.textContent?.trim(),
    }));
  };

  // 1. THE BLOCK'S OWN COPY leaves the primary alone.
  const afterBlock = await bothAfter(() => block.click(), block);
  expect(afterBlock.block).toBe("Copied");
  expect(
    afterBlock.primary,
    "the primary reported a press that landed on the source block",
  ).toBe("Copy SVG");

  // Let the 1.6s reset run out before the second half.
  await expect(block).toHaveText("Copy", { timeout: 3000 });

  // 2. AND THE PRIMARY leaves the block alone.
  const afterPrimary = await bothAfter(() => primary.click(), primary);
  expect(afterPrimary.primary).toBe("Copied");
  expect(
    afterPrimary.block,
    "the source block reported a press that landed on the primary",
  ).toBe("Copy");
});

test("the export menu is held for its close, and not for reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await page.locator(".pixl-card").first().click();
  await expect(page.locator(".pixl-detailbar")).toBeVisible();

  const chevron = page.getByRole("button", { name: "More export options" });
  const menu = page.locator(".pixl-menu");

  await chevron.click();
  await expect(menu).toBeVisible();

  /* 3. HELD, and marked, so the closing state has something to paint. Read
        immediately: the whole point is that it outlives the click. */
  await chevron.click();
  await expect(menu).toHaveClass(/is-closing/);
  await expect(menu).toHaveCount(0);

  /* AND NOT HELD when the motion is not wanted. `useDismissible` skips the
     wait, so the menu is gone on the same tick rather than lingering through an
     animation the viewer has asked not to see. */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await chevron.click();
  await expect(menu).toBeVisible();
  await chevron.click();
  await expect(menu).toHaveCount(0, { timeout: 100 });
});

test("the icon card is a visible step off the grid's ground", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const step = await page.evaluate(() => {
    const rgb = (el: Element) =>
      getComputedStyle(el)
        .backgroundColor.replace(/[^\d,.]/g, "")
        .split(",")
        .slice(0, 3)
        .map(Number);
    const ground = rgb(document.querySelector(".pixl-gallery")!);
    const card = rgb(document.querySelector(".pixl-card")!);
    // Mean absolute difference per channel, 0..255.
    return (
      ground.reduce((a, v, i) => a + Math.abs(v - card[i]), 0) / ground.length
    );
  });

  // The card was `--surface` on the screen's own near-white and measured
  // 1.005:1 against it — a tile you could not see was there, so the grid read
  // as loose icons on a sheet. Two steps of value, not one hairline.
  expect(step).toBeGreaterThan(4);
});

/**
 * THE READOUT'S SEGMENT REFRESH — number pop-in adapted to a trigger the stock
 * recipe does not have.
 *
 * A counter ticks once. A knob streams a new value for as long as the pointer
 * moves, so replaying on every change replays sixty times a second and finishes
 * nothing, which reads as flicker. The throttle is the whole adaptation and it
 * is invisible in the markup — nothing about the CSS says the retrigger floor
 * has to be longer than the duration.
 */
/* IT WAS "UNDER A KNOB", AND THE KNOB IS GONE. The stream this throttle exists
   to survive is not a knob's — it is any control that emits a new colour for as
   long as you hold it, which is now the saturation/lightness FIELD and the hue
   strip. The measured reason is unchanged and is worth restating, because the
   numbers are what make the throttle non-obvious: a recipe that replays on
   every change replays sixty times a second and finishes nothing, so the floor
   between a character's refreshes (200ms) sits ABOVE the animation itself
   (180ms) and a fast drag becomes a steady shimmer rather than a strobe. */
test("the readout refreshes per character, and throttles under a drag", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openColor(page);

  // The overlay has to sit exactly where the input's own glyphs do. If it
  // drifts the readout doubles, and nothing else here would notice.
  const boxes = await page.evaluate(() => {
    const r = (sel: string) =>
      document.querySelector(sel)!.getBoundingClientRect();
    return { digits: r(".pixl-lcd-digits"), input: r(".pixl-lcd-input") };
  });
  expect(Math.abs(boxes.digits.x - boxes.input.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(boxes.digits.width - boxes.input.width)).toBeLessThanOrEqual(
    0.5,
  );

  await page.evaluate(() => {
    (window as unknown as { __hits: number }).__hits = 0;
    document
      .querySelector(".pixl-lcd-digits")!
      .addEventListener(
        "animationstart",
        () => (window as unknown as { __hits: number }).__hits++,
        true,
      );
  });

  /* THE FIELD, not a knob — and `ArrowUp` rather than `ArrowRight`, which is a
     real trap rather than a preference. The gallery starts on #000000, and at
     lightness 0 every saturation of black is still `000000`: walking the
     horizontal axis emits forty changes that the readout correctly ignores,
     because the value never moves. Lightness is the axis that always changes
     the hex. */
  await page.getByRole("slider", { name: "Saturation and lightness" }).focus();
  const steps = 40;
  const started = Date.now();
  for (let i = 0; i < steps; i++) await page.keyboard.press("ArrowUp");
  const elapsed = Date.now() - started;
  await page.waitForTimeout(300);

  const hits = await page.evaluate(
    () => (window as unknown as { __hits: number }).__hits,
  );

  // It animates at all...
  expect(hits).toBeGreaterThan(0);

  // ...and no more often than the floor allows. THE CEILING IS DERIVED, not a
  // number: six characters can each start one animation per 200ms window, so
  // the bound has to scale with how long the run actually took — the same 40
  // presses take 160ms against a production build and 600ms against a dev one,
  // and a fixed bound picked from either passes the unthrottled version of the
  // other. One window of slack for the boundary.
  const ceiling = 6 * (Math.ceil(elapsed / 200) + 1);
  expect(
    hits,
    `${hits} animations in ${elapsed}ms; the floor allows at most ${ceiling}`,
  ).toBeLessThanOrEqual(ceiling);
});

test("reduced motion stops the readout's refresh", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openColor(page);

  const name = await page.evaluate(() => {
    const span = document.querySelector<HTMLElement>(".pixl-lcd-digit")!;
    span.classList.add("is-changed");
    return getComputedStyle(span).animationName;
  });
  expect(name).toBe("none");
});
