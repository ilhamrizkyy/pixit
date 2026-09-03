import { expect, test, type Page } from "@playwright/test";

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

async function pageScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
}

for (const [label, size] of [
  ["desktop", { width: 1440, height: 900 }],
  ["laptop", { width: 1280, height: 720 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`the page does not scroll at ${label} width, loaded or not`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    // A pixel of slack for sub-pixel rounding on the viewport units.
    expect(await pageScroll(page)).toBeLessThanOrEqual(1);

    // Loading an icon adds the detail bar, which is the one thing that changes
    // the board's internal height. The board must absorb it rather than grow.
    await page
      .getByRole("button", { name: /arrow-right/ })
      .first()
      .click();
    await expect(
      page.getByRole("region", { name: "Selected icon" }),
    ).toBeVisible();
    expect(await pageScroll(page)).toBeLessThanOrEqual(1);
  });
}

test("the icons scroll INSIDE the glass, and nothing else does", async ({
  page,
}) => {
  // NARROW AND SHORT, both. A wide window gives the grid more columns and
  // therefore FEWER rows, so 24 icons fit comfortably at 1280 however short the
  // window is — the first attempt at this test used 1280x600 and found no
  // overflow to measure. Four columns of six rows is what actually exceeds the
  // panel.
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/");

  const panel = page.locator("#icon-panel");
  const overflows = await panel.evaluate(
    (el) => el.scrollHeight > el.clientHeight + 1,
  );
  expect(overflows).toBe(true);

  // It really scrolls, and the page stays put while it does.
  await panel.evaluate((el) => el.scrollBy(0, 200));
  expect(await panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await pageScroll(page)).toBeLessThanOrEqual(1);
});

test("the mini screen's gutters match: board edge and big screen alike", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const board = (await page.locator(".pixl-board").boundingBox())!;
  const mini = (await page.locator(".pixl-mini").boundingBox())!;
  const rail = (await page.locator(".pixl-rail").boundingBox())!;
  const glass = (await page.locator(".pixl-screen").boundingBox())!;

  // ONE GUTTER, USED FOUR TIMES NOW. They were different numbers — 20px of air
  // to the board's edge and none at all between the two screens — which reads
  // as a missing gap rather than as two values. The size rail joined this row
  // on 2026-08-29, on the board's RIGHT edge, and a new part slotted into a row
  // is exactly how the original defect got in.
  //
  // Walked left to right across the whole board: body, screen, rail, edge.
  const gaps = [
    mini.x - board.x,
    glass.x - (mini.x + mini.width),
    rail.x - (glass.x + glass.width),
    board.x + board.width - (rail.x + rail.width),
  ];
  expect(Math.min(...gaps)).toBeGreaterThan(8);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
});

test("the detail bar is INSIDE the glass, not a strip of chassis under it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: /arrow-right/ })
    .first()
    .click();
  await settle(page);

  const glass = (await page.locator(".pixl-screen").boundingBox())!;
  const bar = (await page.locator(".pixl-detailbar").boundingBox())!;

  // Contained on every side, and flush to the screen's bottom edge.
  expect(bar.x).toBeGreaterThanOrEqual(glass.x - 1);
  expect(bar.x + bar.width).toBeLessThanOrEqual(glass.x + glass.width + 1);
  expect(bar.y).toBeGreaterThan(glass.y);
  expect(
    Math.abs(bar.y + bar.height - (glass.y + glass.height)),
  ).toBeLessThanOrEqual(1);
});

test("the Shape switch is mounted through the case, at the column's width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  /* NO PAD (2026-08-30). It shared one with Size until Size left for the rail
     in the gutter, which left a panel drawn around a SINGLE control — and a pad
     is what says "these belong together" (§5c), so it was grouping the drum
     with nothing. A switch on a device is mounted through the case, not dropped
     into a tray of its own. */
  expect(await page.locator('.pixl-pad:has([role="radiogroup"])').count()).toBe(
    0,
  );

  // AND IT SPANS THE COLUMN, edge to edge with the two parts above it. The pad
  // it left had 16px of its own padding, so the housing sat inset from the
  // screen and the colour pad both — which reads as a control that did not
  // quite fit rather than as one mounted through the panel.
  const housing = (await page.locator(".pixl-thumb").boundingBox())!;
  const mini = (await page.locator(".pixl-mini").boundingBox())!;
  const pad = (await page.locator("aside .pixl-pad").boundingBox())!;
  for (const [name, part] of [
    ["mini screen", mini],
    ["colour pad", pad],
  ] as const) {
    expect(Math.abs(part.x - housing.x), `left of ${name}`).toBeLessThanOrEqual(
      1,
    );
    expect(
      Math.abs(part.width - housing.width),
      `width against ${name}`,
    ).toBeLessThanOrEqual(1);
  }

  // A COLUMN of three: the values are printed around a barrel and read top to
  // bottom through its window.
  const boxes = await Promise.all(
    (await page.getByRole("radio").all()).map((k) => k.boundingBox()),
  );
  expect(boxes).toHaveLength(3);
  expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
  expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);

  // And the GRIP is the far end of the same housing — one barrel, read at one
  // end and turned at the other, rather than a list beside a separate wheel.
  const grip = (await page.locator(".pixl-thumb-grip").boundingBox())!;
  expect(grip.x).toBeGreaterThan(boxes[0]!.x);
  expect(grip.x + grip.width).toBeLessThanOrEqual(
    housing.x + housing.width + 1,
  );
});

test("the mini screen is a HOLE in the chassis, not a panel glued to it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const cut = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".pixl-mini")!;
    const cs = getComputedStyle(el);
    // ONE ORDERED PASS over both serialisation forms. This test reads the FIRST
    // and LAST stop specifically, so the two forms cannot be matched separately
    // and concatenated — that returns every `rgb()` before every
    // `color(srgb ...)` regardless of where they sit in the gradient, and the
    // moment one stop is written as a `color-mix()` the "top" being read is a
    // stop from the middle.
    const stops = [
      ...cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/g),
    ].map((m) =>
      m[1] !== undefined
        ? m[1]
            .split(/[,\s/]+/)
            .slice(0, 3)
            .map((v) => Number(v) / 255)
        : m[2]
            .trim()
            .split(/[\s/]+/)
            .slice(0, 3)
            .map(Number),
    );
    const mean = (c: number[]) => c.reduce((a, b) => a + b, 0) / c.length;
    return {
      shadow: cs.boxShadow,
      stops: stops.length,
      top: mean(stops[0]),
      bottom: mean(stops[stops.length - 1]),
    };
  });

  // A RECESS CASTS NOTHING. A drop shadow is what a raised part throws onto the
  // panel it stands on, and it is the single thing that made this read as glued
  // to the front of the device rather than fitted into it. Every shadow here is
  // inset — the seam and the lip's own shading.
  expect(cut.shadow).not.toBe("none");
  for (const shadow of cut.shadow.split(/,(?![^(]*\))/)) {
    expect(shadow).toContain("inset");
  }

  // The wall of the cut: under a light from above, the upper wall faces down
  // and falls into shadow while the lower wall faces up and catches the room.
  // Top dark, bottom bright, by a wide margin — a ring that drifted to a flat
  // grey border would still LOOK like a frame and say nothing about depth.
  expect(cut.stops).toBeGreaterThanOrEqual(3);
  expect(cut.bottom).toBeGreaterThan(cut.top + 0.25);
});

test("the nav is a page, not part of the device", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const nav = await page.evaluate(() => {
    const bar = document.querySelector("nav")!;
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

test("the colour knobs are on the BODY, in a pad of their own", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const pad = (await page
    .locator('.pixl-pad:has([role="slider"])')
    .boundingBox())!;
  // ITS OWN PAD, AND ON THE BOARD THE ONLY ONE. Colour is one instrument — a
  // readout and the three knobs that drive it — and it shared a boss with Size
  // and Shape, which are two settings that merely sit next to each other. A pad
  // is what says "these belong together", so one pad round all three was
  // claiming a relationship that is not there. Followed through on 2026-08-30
  // the same rule took the second pad away as well: with Size gone to the rail
  // it held one control and grouped it with nothing.
  expect(await page.locator(".pixl-pad").count()).toBe(1);
  const knobs = await Promise.all(
    (
      await page.getByRole("slider", { name: /Hue|Saturation|Lightness/ }).all()
    ).map((k) => k.boundingBox()),
  );

  // Three of them, in a row, inside the pad. Colour changes HOW every icon is
  // drawn, which is the body's job — the screen carries what changes WHICH
  // icons are shown.
  expect(knobs).toHaveLength(3);
  for (const box of knobs) {
    expect(box!.x).toBeGreaterThanOrEqual(pad.x - 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(pad.x + pad.width + 1);
    expect(box!.y).toBeGreaterThan(pad.y);
  }
  expect(knobs[1]!.x).toBeGreaterThan(knobs[0]!.x);
  expect(knobs[2]!.x).toBeGreaterThan(knobs[1]!.x);
});

/**
 * THE COLUMN IS ONE STACK, EVENLY SPACED, AND THE SLACK IS AT THE BOTTOM.
 *
 * Two rules that keep being confused for one, so they are asserted together.
 *
 * NOTHING GROWS: the pads held three controls once and stretched to finish
 * level with the screen; with Size gone to the rail, stretching a panel around
 * three keys draws a slab of bare plastic with a control in its corner.
 *
 * AND THE SLACK GOES UNDER THE CONTROLS, not over them. It sat above for a day
 * — pads pinned to the FOOT of the column on the argument that bare plastic at
 * the bottom edge reads as an unfinished side — and what that produced was a
 * 152px hole between the screen and the first control at 900px, 302px at 1050.
 * That does not read as case; it reads as two groups that have come apart. The
 * controls operate the screen, so they sit under it.
 *
 * The measurement that catches BOTH is the rhythm: every gap down the column is
 * the same one gap. A pinned pad fails it at the top, a stretched pad at the
 * bottom, and a stray margin inside a pad shows up as a pad taller than what it
 * holds.
 */
for (const height of [900, 1050] as const) {
  test(`the body's column is one stack, evenly spaced — ${height}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height });
    await page.goto("/");

    /* THE THREE PARTS OF THE COLUMN, in the order they are mounted: the mini
       screen, the colour pad, and the Shape switch — which stands on the case
       rather than in a pad of its own since 2026-08-30, so it is named here by
       what it is rather than picked up by a `.pixl-pad` sweep. */
    const boxes = await Promise.all(
      [".pixl-mini", "aside .pixl-pad", ".pixl-thumb"].map(
        async (sel) => (await page.locator(sel).boundingBox())!,
      ),
    );

    // ONE GAP, USED TWICE: screen to the pad, and pad to the switch. A column
    // whose controls have drifted away from the screen they operate fails here
    // first.
    const gaps = [
      boxes[1].y - (boxes[0].y + boxes[0].height),
      boxes[2].y - (boxes[1].y + boxes[1].height),
    ];
    expect(Math.min(...gaps), `gaps ${gaps.join(" / ")}`).toBeGreaterThan(8);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);

    // AND NOTHING STRETCHES. The pad hugs its contents at both heights, which
    // is what makes the gaps above meaningful rather than incidental.
    const knobs = (await page
      .getByRole("slider", { name: /Lightness/ })
      .boundingBox())!;
    expect(
      boxes[1].y + boxes[1].height - (knobs.y + knobs.height),
      "the colour pad is stretching past its knobs",
    ).toBeLessThanOrEqual(40);

    // The slack lands at the FOOT of the column, below the last control.
    const screen = (await page.locator(".pixl-screen").boundingBox())!;
    expect(boxes[2].y + boxes[2].height).toBeLessThan(screen.y + screen.height);
  });
}

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
  await page.addInitScript(() => {
    try {
      localStorage.setItem("pixle-theme", "dark");
    } catch {}
  });
  await page.goto("/");

  // Dark's default is #ffffff, which is all letters and no digits.
  const field = page.getByLabel("Icon colour, as a hex value");
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
 * THE BOARD SAYS ONE NAME, IN THE ONE PLACE IT SAYS A NAME.
 *
 * It was three places until 2026-09-03: the nav's wordmark, the mini screen's
 * bezel, and the badge cut into the case. The bezel now prints NOTHING, which
 * makes this test half a rename guard and half a guard against the printing
 * coming back — three separate things were tried on that band in one day, and
 * each was argued from the object before it was seen on the board.
 *
 * Both survivors are `aria-hidden` decoration except the nav's, so axe will
 * never be what notices them drifting apart.
 */
test("the wordmark and the engraved badge say one name, and the bezel says nothing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const BRAND = "pixit";

  // The page's real wordmark, which is the one a screen reader gets.
  await expect(page.getByRole("link", { name: BRAND })).toBeVisible();

  // Cut into the case's bottom-left corner, and it is the whole of what is
  // marked there — a model name beside it was built for a pass and removed.
  const board = page.locator(".pixl-board-legend");
  expect((await board.textContent())!.trim().toLowerCase()).toBe(BRAND);

  /* AND THE MODULE CARRIES NO PRINTING AT ALL. Read as the bezel's whole text
     rather than as the absence of one selector, because each of the three
     things that sat here brought its own class with it and a test naming them
     would pass against the fourth. */
  const module_ = page.locator(".pixl-mini-body");
  expect((await module_.textContent())!.trim()).toBe("");
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
 * THE CASE'S BADGE IS ENGRAVED INTO IT, AND IT DOES NOT SCROLL.
 *
 * Five constructions reached this one, and the last two are why the assertions
 * read the way they do. Flat INK with no relief was built on a misreading of
 * the reference; RAISED was built next and had the physics right and the
 * direction wrong — the word stood off the case instead of being cut into it.
 * So the letters carry NO INK, and they are the FLOOR OF A CUT: one step below
 * the panel, with the cut's two walls doing the reading.
 *
 * WHICH MAKES THE CENTRAL ASSERTION THE OPPOSITE OF THE INK BUILD'S. Ink LIES
 * ON a panel, so that build had to be dark on silver and light on charcoal, and
 * the test asserted the inversion. A cut does not invert: it is darker than its
 * panel in BOTH themes because it is a hole, with the light in its lower wall
 * either way. The ink build fails the floor check here in light mode and fails
 * it enormously in dark; the raised build fails every direction check at once.
 *
 * AND IT IS STILL NOT COLOURED. It ran orange-in-light / red-in-dark for one
 * pass: the rail's marker is the body's one coloured thing, and five letters
 * take weight off a 32px pointer. Those two assertions survive the rebuild
 * unchanged, because "no ink" makes them stronger rather than moot.
 */
for (const theme of ["light", "dark"] as const) {
  test(`the board's badge is engraved into the case — ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("pixle-theme", t);
      } catch {}
    }, theme);
    await page.goto("/");

    const badge = page.locator(".pixl-board-legend");
    await expect(badge).toHaveAttribute("aria-hidden", "true");

    const relief = await page.evaluate(() => {
      const el = document.querySelector(".pixl-board-legend")!;
      /* RGB *AND* ALPHA. Both walls are `color-mix`ed toward transparent, so
         comparing parsed RGB alone compares a token against itself and every
         "brighter than" is a tie. The alpha is the whole difference. */
      const parse = (value: string) => {
        const srgb = /color\(srgb ([^)]+)\)/.exec(value);
        if (srgb !== null) {
          const parts = srgb[1]
            .trim()
            .split(/[\s/]+/)
            .map(Number);
          return [...parts.slice(0, 3).map((v) => v * 255), parts[3] ?? 1];
        }
        const parts = value
          .replace(/[^\d,.]/g, "")
          .split(",")
          .map(Number);
        return [...parts.slice(0, 3), parts[3] ?? 1];
      };
      /* SPLIT THE SHADOW LIST ON TOP-LEVEL COMMAS ONLY. `rgba(244, 245, 248,
         0.62) -1px -1px 0px` carries three commas of its own, so a plain
         `split(",")` shreds the colour into pieces and every wall parses as
         nonsense that happens not to throw. */
      const shadows = (value: string) => {
        const out: string[] = [];
        let depth = 0;
        let start = 0;
        for (let i = 0; i < value.length; i++) {
          const c = value[i];
          if (c === "(") depth++;
          else if (c === ")") depth--;
          else if (c === "," && depth === 0) {
            out.push(value.slice(start, i).trim());
            start = i + 1;
          }
        }
        out.push(value.slice(start).trim());
        return out
          .filter((s) => s.length > 0)
          .map((s) => {
            const head = /^(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+)/i.exec(s);
            // Only the offsets carry `px`; the colour never does.
            const px = [...s.matchAll(/(-?[\d.]+)px/g)].map((m) =>
              Number(m[1]),
            );
            return {
              color: parse(head === null ? s : head[1]),
              dx: px[0],
              dy: px[1],
            };
          });
      };
      const cs = getComputedStyle(el);
      const column = el.parentElement!.getBoundingClientRect();
      const screen = document
        .querySelector(".pixl-screen")!
        .getBoundingClientRect();
      /* RESOLVE A TOKEN, DO NOT PARSE IT. `getPropertyValue` hands back the
         AUTHORED text — `#f97316` — and stripping the non-numerics out of a hex
         yields one long number rather than three channels. A probe turns it
         into a real computed colour whatever notation it was written in. */
      const token = (name: string) => {
        const probe = document.createElement("span");
        probe.style.color = getComputedStyle(
          document.documentElement,
        ).getPropertyValue(name);
        document.documentElement.append(probe);
        const resolved = parse(getComputedStyle(probe).color);
        probe.remove();
        return resolved;
      };

      return {
        face: parse(cs.color),
        panel: token("--frame-2"),
        walls: shadows(cs.textShadow),
        // The two engraved builds. Each shipped once.
        filter: cs.filter,
        clip: cs.webkitBackgroundClip ?? "",
        // The accent belongs to the rail's marker alone (§7).
        accent: token("--indicator"),
        left: el.getBoundingClientRect().x - column.x,
        foot: el.getBoundingClientRect().bottom - screen.bottom,
      };
    });

    const linear = (v: number) =>
      v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
    const luminance = ([r, g, b]: number[]) =>
      0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    // A translucent wall means nothing until it is composited onto its ground.
    const on = ([r, g, b, a]: number[], bg: number[]) =>
      luminance([r, g, b].map((c, i) => c * a + bg[i] * (1 - a)));
    const ratio = (a: number, b: number) =>
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

    // NO GRADIENT INSIDE THE LETTERFORM. A filter or a text clip is one of the
    // two engraved builds coming back.
    expect(relief.filter === "none" || relief.filter === "").toBe(true);
    expect(relief.clip === "" || relief.clip === "border-box").toBe(true);

    const panel = luminance(relief.panel);
    const face = on(relief.face, relief.panel);

    /* THE FLOOR IS THE CASE, ONE STEP DOWN, IN BOTH THEMES. It is the bottom of
       a hole, so it takes less light than the panel — never more, and never far
       from it. Both halves matter: the first is what the RAISED build failed in
       both themes and what the ink build failed on silver, the second is what
       the ink build failed on charcoal, where the ink was white. */
    expect(
      face,
      `${theme}: floor ${relief.face} is not below the panel`,
    ).toBeLessThan(panel);
    expect(
      ratio(face, panel),
      `${theme}: floor ${relief.face} is ink, not a cut in the case`,
    ).toBeLessThan(1.5);

    /* TWO WALLS, DARK ON TOP AND LIT BELOW, AND THEY DO NOT INVERT WITH THE
       CASE. The key is up and to the LEFT everywhere on this object (§5c), so a
       cut's upper wall faces away from it and its lower wall catches it — which
       is the ordering `.pixl-well` and `.pixl-mini` are already held to, and the
       exact pair the RAISED build had the other way round. It holds in light
       mode and in dark, which is the property a palette swap silently breaks. */
    expect(
      relief.walls,
      `${theme}: walls ${JSON.stringify(relief.walls)}`,
    ).toHaveLength(2);
    const shaded = relief.walls.find((w) => w.dx < 0 && w.dy < 0);
    const lit = relief.walls.find((w) => w.dx > 0 && w.dy > 0);
    expect(shaded, `${theme}: no wall offset up-left`).toBeDefined();
    expect(lit, `${theme}: no wall offset down-right`).toBeDefined();

    const litL = on(lit!.color, relief.panel);
    const shadedL = on(shaded!.color, relief.panel);
    expect(
      shadedL,
      `${theme}: the cut's upper wall is not in shadow`,
    ).toBeLessThan(panel);
    expect(
      litL,
      `${theme}: the cut's lower lip is not catching the light`,
    ).toBeGreaterThan(panel);

    /* AND NEITHER WALL IS SO WEAK THE WORD VANISHES. The pair IS the badge —
       the floor carries no colour of its own — so a cut held back until the
       walls stop reading is a blank corner of plastic. Held from ABOVE too, by
       the floor check: at full strength a near-white line under every letter is
       a rule rather than a wall, which is why construction 3 came off. */
    expect(
      ratio(litL, panel),
      `${theme}: the lit wall is invisible at ${ratio(litL, panel).toFixed(2)}:1`,
    ).toBeGreaterThan(1.1);
    expect(
      ratio(shadedL, panel),
      `${theme}: the shaded wall is invisible at ${ratio(shadedL, panel).toFixed(2)}:1`,
    ).toBeGreaterThan(1.1);

    /* IT IS THE CASE'S OWN GREY, NOT A HUE. Read as saturation, because
       luminance cannot tell orange from grey — DESIGN.md records that the two
       sit within ~1.3:1 of each other, which is the whole reason the rail's
       marker is identified by its keyline rather than its fill. A coloured
       badge shipped for one pass, so this is a real regression to hold. */
    const [r, g, b] = relief.face;
    expect(
      Math.max(r, g, b) - Math.min(r, g, b),
      `badge floor ${relief.face} is a hue, not the case`,
    ).toBeLessThan(24);

    // Nor the marker's accent, which is the body's one coloured thing.
    const [ar, ag, ab] = relief.accent;
    expect(
      Math.abs(r - ar) + Math.abs(g - ag) + Math.abs(b - ab),
      `badge floor ${relief.face} is the accent`,
    ).toBeGreaterThan(60);

    // HARD INTO THE BOTTOM-LEFT CORNER, level with the screen's foot.
    expect(Math.abs(relief.left)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(relief.foot),
      `foot is ${relief.foot}px off`,
    ).toBeLessThanOrEqual(1);
  });
}

/**
 * THE BADGE IS ON THE CASE, SO IT DOES NOT SCROLL.
 *
 * The column scrolls on a short window — by rule the mini screen gives up
 * height first, and only past its floor does anything move. Printing on a case
 * is not part of that content: as the last child of the scroll box it slid up
 * over the controls and off the bottom edge it was printed on.
 *
 * Measured by actually scrolling, not by inspecting the tree: an `overflow`
 * three ancestors up is exactly the kind of thing a refactor moves.
 */
test("the case's badge stays on the bottom edge when the column scrolls", async ({
  page,
}) => {
  // Short enough that the column's content cannot fit even with the mini
  // screen at its floor.
  await page.setViewportSize({ width: 1440, height: 560 });
  await page.goto("/");

  const badge = page.locator(".pixl-board-legend");
  const before = (await badge.boundingBox())!;

  const scrolled = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("div")].filter(
      (el) =>
        el.scrollHeight > el.clientHeight + 4 && el.querySelector(".pixl-mini"),
    );
    if (boxes.length === 0) return 0;
    boxes[boxes.length - 1].scrollTop = 9999;
    return boxes[boxes.length - 1].scrollTop;
  });
  // The premise: there IS a scroll to survive. Without it this passes vacuously.
  expect(scrolled, "the column did not scroll at 560px").toBeGreaterThan(0);

  const after = (await badge.boundingBox())!;
  expect(
    Math.abs(after.y - before.y),
    "the badge moved with the scroll",
  ).toBeLessThanOrEqual(1);

  const screen = (await page.locator(".pixl-screen").boundingBox())!;
  expect(
    Math.abs(after.y + after.height - (screen.y + screen.height)),
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
  // Deliberately TALL: the failure only appears when the column has slack.
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");

  const glass = (await page.locator(".pixl-mini-glass").boundingBox())!;
  expect(glass.height / glass.width).toBeCloseTo(1, 1);
});

test("the whole hex readout is a text field, not a 7ch slot in one", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const lcd = (await page.locator(".pixl-lcd").boundingBox())!;

  // Click in the DEAD SPACE past the six digits — right of the value, left of
  // the "HEX" unit. The input was sized to its content, so most of a 264px
  // panel looked like somewhere you could click and did nothing when you did.
  await page.mouse.click(lcd.x + lcd.width * 0.6, lcd.y + lcd.height / 2);

  const focused = await page.evaluate(
    () => document.activeElement?.getAttribute("aria-label") ?? null,
  );
  expect(focused).toBe("Icon colour, as a hex value");
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

for (const theme of ["light", "dark"] as const) {
  test(`the knob is moulded in the case's own plastic — ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("pixle-theme", t);
      } catch {}
    }, theme);
    await page.goto("/");

    const dial = await paint(page, ".toy-knob-dial", "background");
    const mark = await paint(page, ".toy-knob-mark", "background");
    // The case's own tone, resolved through a probe so it comes back in the
    // same units as everything else here.
    const frame = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--frame)";
      document.documentElement.append(probe);
      const rgb = getComputedStyle(probe)
        .backgroundColor.replace(/[^\d,.]/g, "")
        .split(",")
        .slice(0, 3)
        .map(Number);
      probe.remove();
      return rgb.reduce((a, b) => a + b, 0) / 3 / 255;
    });

    // IT FOLLOWS THE BOARD. Not the ink's rule — the ink inverts because it has
    // to be read against the chassis, and a knob is a part OF the chassis. This
    // catches both failures it has actually had: a white dial on the silver
    // board, and its inverse, which looked like three black knobs bolted on.
    expect(Math.abs(dial.level - frame)).toBeLessThan(0.15);

    // The PIP is the one part that inverts, and against the DIAL rather than
    // the board: a pointer you cannot see on the knob it points from reports
    // nothing.
    expect(Math.abs(mark.level - dial.level)).toBeGreaterThan(0.35);

    // THE RING STANDS OFF THE DIAL. Measured as fractions of the housing's
    // radius: the dial's own box gives its outer edge, and the ring's inner
    // edge is the percentage in its mask. This was tightened to a 2% seam for
    // one pass on a misread of the reference, which welded the scale to the
    // knob — and nothing failed, because a gap is pure geometry.
    const geometry = await page.evaluate(() => {
      const housing = document.querySelector<HTMLElement>(".toy-knob")!;
      const dialEl = document.querySelector<HTMLElement>(".toy-knob-dial")!;
      const ringEl = document.querySelector<HTMLElement>(".toy-knob-ring")!;
      const mask =
        getComputedStyle(ringEl).maskImage ||
        getComputedStyle(ringEl).webkitMaskImage;
      return {
        dial:
          dialEl.getBoundingClientRect().width /
          housing.getBoundingClientRect().width,
        // "transparent 0 90%" — the second percentage is the ring's inner edge.
        ringInner: Number(/(\d+(?:\.\d+)?)%\s*,/.exec(mask)?.[1] ?? NaN) / 100,
      };
    });
    expect(geometry.ringInner).toBeGreaterThan(0);
    expect(geometry.ringInner - geometry.dial).toBeGreaterThan(0.08);
  });

  test(`the mini screen is an LCD, readable in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("pixle-theme", t);
      } catch {}
    }, theme);
    await page.goto("/");

    const lcd = await paint(page, ".pixl-mini-glass", "background");

    // A SEGMENT PANEL, not the icon grid's screen: it carries the sage cast
    // every device with one has. Green above both its neighbours.
    expect(lcd.rgb[1]).toBeGreaterThan(lcd.rgb[0]);
    expect(lcd.rgb[1]).toBeGreaterThan(lcd.rgb[2]);

    // And the icon on it stays readable. This is the trap the whole
    // theme-adaptive LCD exists to avoid: the gallery's colour is white in
    // dark mode, and white on a lit sage panel is 2.5:1. Art, not text — so
    // axe would never look — which is why it is measured here.
    const linear = (v: number) =>
      v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const luminance = ([r, g, b]: [number, number, number]) =>
      0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    const ink = theme === "dark" ? 1 : 0;
    const [hi, lo] = [ink, luminance(lcd.rgb)].sort((a, b) => b - a);
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThan(4.5);
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`both boards draw on the SAME panel — ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("pixle-theme", t);
      } catch {}
    }, theme);

    await page.goto("/");
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

test("only the PIP turns — the dial's lighting stays where the light is", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const read = () =>
    page.evaluate(() => {
      const m = (sel: string) =>
        new DOMMatrixReadOnly(
          getComputedStyle(document.querySelector(sel)!).transform,
        );
      // The rotation angle each element is carrying, in degrees.
      const angle = (sel: string) => {
        const x = m(sel);
        return Math.round((Math.atan2(x.b, x.a) * 180) / Math.PI);
      };
      return { dial: angle(".toy-knob-dial"), spin: angle(".toy-knob-spin") };
    });

  expect(await read()).toEqual({ dial: 0, spin: 0 });

  await page.getByRole("slider", { name: "Hue" }).focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press("Shift+ArrowRight");

  // The pip has gone round; the dome has not. The rotation used to sit on the
  // dial, which carried its whole baked gradient with it — the crown highlight
  // swung to the side and then underneath, so the light appeared to orbit the
  // room. A surface of revolution turning about its own axis does not change
  // how it is lit, which is why the mesh build never showed this and the CSS
  // one had to be told.
  const after = await read();
  expect(after.spin).not.toBe(0);
  expect(after.dial).toBe(0);
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
    const ground = rgb(document.querySelector(".pixl-screen")!);
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
 * `.pixl-well` is the theme toggle in the nav now — the hex field became a
 * segment panel and took `.pixl-lcd` with it. `.pixl-pad` joined the list on
 * 2026-08-29, when the control sections stopped being raised bosses and became
 * regions of the case you drop controls INTO; that inversion is one line of
 * gradient away from coming back, and it comes back looking merely "a bit
 * flat" rather than obviously wrong.
 */
for (const [name, sel] of [
  ["the toggle's well", ".pixl-well"],
  ["a control pad", ".pixl-pad"],
  ["the size groove", ".pixl-groove"],
] as const) {
  test(`${name} is a hole, not a box with a border`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const well = await page.evaluate((selector) => {
      const cs = getComputedStyle(document.querySelector(selector)!);
      const stops = [
        ...cs.backgroundImage.matchAll(
          /rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/g,
        ),
      ].map((m) =>
        m[1] !== undefined
          ? m[1]
              .split(/[,\s/]+/)
              .slice(0, 3)
              .map((v) => Number(v) / 255)
          : m[2]
              .trim()
              .split(/[\s/]+/)
              .slice(0, 3)
              .map(Number),
      );
      const mean = (c: number[]) => c.reduce((a, b) => a + b, 0) / c.length;
      // Split the shadow list on commas that are not inside a colour function.
      const shadows = cs.boxShadow.split(/,(?![^(]*\))/).map((x) => x.trim());
      return {
        image: cs.backgroundImage,
        top: mean(stops[0]),
        bottom: mean(stops[stops.length - 1]),
        outer: shadows
          .filter((x) => !x.includes("inset"))
          .map((x) => {
            const c = /rgba?\(([^)]+)\)/
              .exec(x)![1]
              .split(/[,\s/]+/)
              .map(Number);
            return { level: (c[0] + c[1] + c[2]) / 3 / 255, text: x };
          }),
        insets: shadows.filter((x) => x.includes("inset")).length,
      };
    }, sel);

    // A recess is darkest along its TOP edge, where the panel's lip shades it,
    // and lightest along the bottom where the floor turns up into the room — so
    // the shading runs top to bottom, and only top to bottom. It was a RADIAL
    // gradient with its dark stop in the middle, which is a dish, and a dish in a
    // rectangle is a smudge. The stop order alone does not catch that: the radial
    // ran dark-to-light too, just outward from the centre.
    expect(well.image).toContain("linear-gradient");
    expect(well.image).not.toContain("radial-gradient");
    expect(well.bottom).toBeGreaterThan(well.top + 0.02);
    // The cut, the lip's shadow and its falloff, and the lit lower wall.
    expect(well.insets).toBeGreaterThanOrEqual(4);

    // ANY OUTER SHADOW HERE MUST BE LIGHT. A dark one is what a RAISED part
    // throws onto the panel it stands on, and it is the single thing that would
    // flip this back to a box sitting on the surface — the same failure the mini
    // screen had twice.
    for (const shadow of well.outer) {
      expect(
        shadow.level,
        `outer shadow "${shadow.text}" is dark`,
      ).toBeGreaterThan(0.5);
    }
  });
}

/**
 * A HOLE HAS FOUR WALLS. Every recess on the board had two.
 *
 * Every x-offset in every one of these shadow stacks was 0 — the top was shaded
 * and the bottom lit, and the sides were nothing at all, so each recess died
 * away toward its ends and read shallow however deep the top was made. The big
 * screen was worse: it had a LEFT wall and no right, so the cut ran out halfway
 * across.
 *
 * It is the same defect three times, which is the argument for one test over
 * all of them rather than three assertions written where each was found.
 */
for (const [name, selector] of [
  ["the hex readout", ".pixl-lcd"],
  ["the colour's screen", ".pixl-swatch"],
  ["a control pad", ".pixl-pad"],
  ["the theme toggle's well", ".pixl-well"],
  ["the icon screen", ".pixl-screen"],
  ["the mini screen's cut", ".pixl-mini"],
  ["the size groove", ".pixl-groove"],
] as const) {
  test(`${name} has side walls, not just a top and a bottom`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const walls = await page.evaluate((sel) => {
      const cs = getComputedStyle(document.querySelector(sel)!);
      return cs.boxShadow
        .split(/,(?![^(]*\))/)
        .filter((x) => x.includes("inset"))
        .map((x) => {
          // "rgba(0, 0, 0, 0.42) 5px 0px 7px -6px inset" — the lengths follow
          // the colour, so strip that first and read the first two.
          const lengths = x
            .replace(/rgba?\([^)]*\)|color\([^)]*\)/g, "")
            .match(/-?[\d.]+px/g);
          return {
            x: Number.parseFloat(lengths?.[0] ?? "0"),
            y: Number.parseFloat(lengths?.[1] ?? "0"),
          };
        });
    }, selector);

    // One wall on each side. Uneven depth is fine and intended — the key is up
    // and to the left everywhere on this object — but neither side may be
    // missing.
    expect(
      walls.some((w) => w.x > 0),
      "no left wall",
    ).toBe(true);
    expect(
      walls.some((w) => w.x < 0),
      "no right wall",
    ).toBe(true);
    // And the top is still shaded, so this cannot pass on sides alone.
    expect(
      walls.some((w) => w.y > 0),
      "no lip shading the top",
    ).toBe(true);
  });
}

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
test("the readout refreshes per character, and throttles under a knob", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

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

  await page.getByRole("slider", { name: "Lightness" }).focus();
  const steps = 40;
  const started = Date.now();
  for (let i = 0; i < steps; i++) await page.keyboard.press("ArrowRight");
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

  const name = await page.evaluate(() => {
    const span = document.querySelector<HTMLElement>(".pixl-lcd-digit")!;
    span.classList.add("is-changed");
    return getComputedStyle(span).animationName;
  });
  expect(name).toBe("none");
});

/**
 * THE SIZE SCALE'S GEOMETRY — four things measured from four different boxes
 * that all have to agree.
 *
 * A native thumb's centre travels `trackLength - thumbLength`, so the ruler's
 * graduations, the printed numbers AND the marker are all inset by half a
 * thumb. It went wrong twice in one sitting when there were only three of them:
 * the handle shrank from 26px to 14px and the token was left behind, and the
 * input carried the strip's inset a second time on top of the strip's own. Both
 * are invisible mid-scale and wrong at the ends, which is the worst way to fail.
 *
 * The marker joined the list on 2026-08-29, when it stopped being the native
 * thumb and became a real element that could carry a readout — which is exactly
 * the kind of change that lets a control's pointer drift off its own scale.
 */
test("the ruler, the numbers and the marker's travel all line up", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const scale = await page.evaluate(() => {
    const rail = document.querySelector(".pixl-rail")!;
    /* RESOLVE THE TOKEN, DO NOT PARSE IT. `getPropertyValue` hands back the
       AUTHORED text — `1.5rem`, not `24px` — so `parseFloat` quietly returns
       1.5 and every derived number is out by an order of magnitude. It found
       this the moment the token stopped being written in px, which is precisely
       the kind of change nobody re-reads a test for. A probe carrying the value
       as a width is measured in real pixels, whatever unit it was written in. */
    const px = (name: string) => {
      const probe = document.createElement("div");
      probe.style.cssText = `position:absolute;visibility:hidden;width:var(${name})`;
      rail.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    };
    const box = (sel: string) =>
      rail.querySelector(sel)!.getBoundingClientRect();
    const input = box(".pixl-range");
    const ruler = box(".pixl-groove-ruler");
    const centre = (el: Element) => {
      const b = el.getBoundingClientRect();
      return b.y + b.height / 2;
    };

    /* THE SIZE THE THUMB IS ACTUALLY DRAWN AT, read off the rule that draws it.
       A pseudo-element has no box to query — `getComputedStyle(el,
       "::-webkit-slider-thumb").width` reports the INPUT's width — so the check
       has to be that the tokens and the declarations agree, which is exactly the
       thing that came apart when the handle shrank and the token stayed. */
    let drawn = { width: "", height: "" };
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (
            rule instanceof CSSStyleRule &&
            rule.selectorText.includes("-webkit-slider-thumb") &&
            rule.style.width !== ""
          ) {
            drawn = { width: rule.style.width, height: rule.style.height };
          }
        }
      } catch {
        // A cross-origin sheet cannot be read; ours can.
      }
    }

    const travel = px("--scale-travel");
    const ticks = [...rail.querySelectorAll(".pixl-groove-tick")];
    return {
      travel,
      h: px("--scale-h"),
      drawn,
      span: [input.bottom - travel / 2, input.y + travel / 2],
      ruler: [ruler.bottom, ruler.y],
      majors: ticks
        .filter((t) => !t.classList.contains("is-minor"))
        .map(centre),
      minors: ticks.filter((t) => t.classList.contains("is-minor")).length,
      marks: [...rail.querySelectorAll(".pixl-scale-mark")].map(centre),
    };
  });

  // The travel is a token because everything else insets itself by half of it,
  // so the token has to be what the thumb is actually drawn at. Comparing the
  // ruler against a travel computed FROM the token would move both together and
  // see nothing.
  expect(scale.travel).toBeGreaterThan(0);
  expect(scale.drawn.width).toBe("var(--scale-w)");
  expect(scale.drawn.height).toBe("var(--scale-h)");
  // And the travel is the AXIS one, not the other: a rail insetting itself by
  // half the thumb's width would be out by half a rail at both ends.
  expect(scale.travel).toBe(scale.h);

  // The ruler spans exactly the marker's travel, so the bottom graduation and
  // the top one are the two extreme positions it can reach.
  expect(Math.abs(scale.ruler[0] - scale.span[0])).toBeLessThanOrEqual(0.5);
  expect(Math.abs(scale.ruler[1] - scale.span[1])).toBeLessThanOrEqual(0.5);

  // FOURTEEN STOPS, ALL NUMBERED, WITH A MINOR BETWEEN EACH PAIR. The minors
  // are a printed subdivision rather than reachable values — there is one fewer
  // of them than there are stops, which is what "between" means and what a
  // ruler that had simply doubled its pitch would fail.
  expect(scale.majors).toHaveLength(14);
  expect(scale.minors).toBe(13);
  expect(scale.marks).toHaveLength(14);
  for (let i = 0; i < scale.majors.length; i++) {
    expect(
      Math.abs(scale.majors[i] - scale.marks[i]),
      `major ${i} at ${scale.majors[i]} vs its number at ${scale.marks[i]}`,
    ).toBeLessThanOrEqual(1);
  }
});

/**
 * EVERY GRADUATION LOOKS LIKE ITS KIND, AND NOTHING IS SPECIAL-CASED.
 *
 * 48 — where the grid stops growing and the scale starts setting the export
 * size alone — wore a full-width graduation for one pass. A ruler with one mark
 * unlike all the others reads as damage before it reads as information, so the
 * region is announced now and no longer drawn.
 *
 * The minors also have to stay INTERLEAVED rather than merely present: a minor
 * sits halfway between each pair of stops, so every gap between two majors
 * holds exactly one.
 */
test("the ruler has two lengths of graduation and no third", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  /* THE ARMS ARE THE GRADUATION, not the tick. A mark flanks its number now —
     two arms in from the channel's walls with the number in the break between
     them — so the tick is only the span they are measured across and is the
     same width for both kinds. Measuring it was what the old build measured,
     and it would now report "one length" for a ruler with two. */
  const widths = await page.evaluate(() => {
    const rail = document.querySelector(".pixl-rail")!;
    const by = (minor: boolean) =>
      [...rail.querySelectorAll(".pixl-groove-tick")]
        .filter((t) => t.classList.contains("is-minor") === minor)
        .flatMap((t) => [...t.querySelectorAll(".pixl-groove-arm")])
        .map((a) => +a.getBoundingClientRect().width.toFixed(2));
    return { major: by(false), minor: by(true) };
  });

  // Two arms per graduation, every time: a mark with one is a mark that has
  // lost half of itself, and stacked marks are the build this replaced.
  expect(widths.major).toHaveLength(28);
  expect(widths.minor).toHaveLength(26);

  // Uniform within each kind — 48 is a major like any other major.
  expect(new Set(widths.major).size).toBe(1);
  expect(new Set(widths.minor).size).toBe(1);
  // And the two kinds are told apart by length, clearly.
  expect(widths.major[0]).toBeGreaterThan(widths.minor[0] * 1.5);

  // INTERLEAVED, AND HALFWAY. Reading the ruler top to bottom gives major,
  // minor, major, minor — and each minor sits at the MIDPOINT of the pair it
  // divides. The order alone is not enough: minors at the quarter points
  // alternate just as neatly and are not a subdivision of anything.
  const marks = await page.$$eval(".pixl-rail .pixl-groove-tick", (nodes) =>
    nodes
      .map((n) => {
        const b = n.getBoundingClientRect();
        return {
          y: b.y + b.height / 2,
          minor: n.classList.contains("is-minor"),
        };
      })
      .sort((a, b) => a.y - b.y),
  );

  expect(marks.map((m) => (m.minor ? "m" : "M")).join("")).toBe(
    "Mm".repeat(13) + "M",
  );
  for (let i = 1; i < marks.length - 1; i += 2) {
    const midpoint = (marks[i - 1].y + marks[i + 1].y) / 2;
    expect(
      Math.abs(marks[i].y - midpoint),
      `minor ${(i - 1) / 2} at ${marks[i].y} vs the midpoint ${midpoint}`,
    ).toBeLessThanOrEqual(1);
  }
});

/**
 * UP IS MORE.
 *
 * A vertical range is turned with `writing-mode` now — `appearance:
 * slider-vertical` was removed from Chrome in 121 — and `writing-mode` alone
 * puts the MINIMUM at the top. It takes `direction: rtl` as well to get a
 * thermometer that runs the right way, which is one declaration away from a
 * scale reading 120 at the top and handing you 16 when you drag there.
 *
 * Checked through the keyboard AND the pointer, because they resolve the axis
 * by different routes.
 */
test("the rail runs upward: the top of the scale is the maximum", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const rail = page.locator(".pixl-rail .pixl-range");
  await rail.focus();

  await rail.press("Home");
  await expect(rail).toHaveValue("16");
  await rail.press("End");
  await expect(rail).toHaveValue("120");

  await rail.press("ArrowDown");
  await expect(rail).toHaveValue("112");
  await rail.press("ArrowUp");
  await expect(rail).toHaveValue("120");

  // And the pointer agrees: the top of the groove is the big end.
  const groove = (await page.locator(".pixl-rail .pixl-groove").boundingBox())!;
  await page.mouse.click(
    groove.x + groove.width / 2,
    groove.y + groove.height * 0.9,
  );
  const low = Number(await rail.inputValue());
  await page.mouse.click(
    groove.x + groove.width / 2,
    groove.y + groove.height * 0.1,
  );
  const high = Number(await rail.inputValue());
  expect(high).toBeGreaterThan(low);
});

/**
 * THE MARKER RIDES ITS OWN SCALE, AND ITS LENS FRAMES THE STOP IT IS ON.
 *
 * It was the native thumb; it is a real element so that it can carry a window.
 * That makes two things newly breakable — the marker can drift off the travel
 * it no longer defines, and the lens can end up framing the wrong number or
 * none at all. The lens PRINTS NOTHING of its own (a magnifier that renders its
 * own digits is a badge), so the only way to check it is where it sits.
 */
test("the marker rides its own scale and frames the stop it is on", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const rail = page.locator(".pixl-rail");
  const input = rail.locator(".pixl-range");

  for (const [value, index] of [
    ["16", 0],
    ["40", 3],
    ["96", 10],
    ["120", 13],
  ] as const) {
    await input.evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);

    /* LET IT ARRIVE. The marker TRAVELS to its detent now rather than
       teleporting — that is the whole of the smoothness fix — so measuring the
       frame after the value changes catches it mid-flight. A CSS transition is
       in `getAnimations()`, so it can simply be awaited. */
    await page.evaluate(() =>
      Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      ),
    );

    const aligned = await rail.evaluate((el, i) => {
      const mid = (node: Element) => {
        const b = node.getBoundingClientRect();
        return b.y + b.height / 2;
      };
      const lens = el
        .querySelector(".pixl-marker-lens")!
        .getBoundingClientRect();
      const marks = [...el.querySelectorAll(".pixl-scale-mark")];
      const printed = marks.find(
        (n) => n.textContent === String(el.querySelector("input")!.value),
      )!;
      const box = printed.getBoundingClientRect();
      return {
        marker: mid(el.querySelector(".pixl-marker")!),
        tick: mid(el.querySelectorAll(".pixl-groove-tick")[i]!),
        lens: [lens.top, lens.bottom, lens.left, lens.right],
        printed: [mid(printed), box.x + box.width / 2],
        // The framed number's rendered size, against its neighbours'.
        framedHeight: box.height,
        otherHeights: marks
          .filter((n) => n !== printed)
          .map((n) => n.getBoundingClientRect().height),
      };
    }, index);

    // Dead on its own graduation, at both ends of the travel and in the middle
    // — the three places a half-a-marker error hides or shows.
    expect(
      Math.abs(aligned.marker - aligned.tick),
      `at ${value}: marker ${aligned.marker} vs graduation ${aligned.tick}`,
    ).toBeLessThanOrEqual(1);

    // And the window is over the printed number for this value, which is the
    // only place the value is shown on the rail now.
    const [top, bottom, left, right] = aligned.lens;
    const [y, x] = aligned.printed;
    expect(
      y,
      `at ${value}: number at y ${y} vs lens ${top}..${bottom}`,
    ).toBeGreaterThan(top);
    expect(y).toBeLessThan(bottom);
    expect(
      x,
      `at ${value}: number at x ${x} vs lens ${left}..${right}`,
    ).toBeGreaterThan(left);
    expect(x).toBeLessThan(right);

    /* AND THE GLASS MAGNIFIES IT. The lens prints nothing of its own, so the
       only way for it to be a magnifier is to enlarge the number actually
       printed under it — and the only way to check that is to measure the
       framed number against its unmagnified neighbours. Position alone passed
       happily with the magnification removed altogether. */
    const biggestOther = Math.max(...aligned.otherHeights);
    expect(
      aligned.framedHeight,
      `at ${value}: framed number ${aligned.framedHeight.toFixed(1)}px vs largest neighbour ${biggestOther.toFixed(1)}px`,
    ).toBeGreaterThan(biggestOther * 1.2);
  }
});

/**
 * THE RAIL IS INSET FROM THE SCREEN, AND ONLY INSET.
 *
 * Run to the screen's full height it reads as a second edge of the case rather
 * than an instrument mounted on it; taken well short it reads as a stray
 * control floating beside the screen. Both ends of that shipped by accident —
 * an edit to this number silently did nothing for two rounds, because nothing
 * measured it and a bare string replace that matches nothing is not an error
 * anywhere.
 */
test("the size rail is inset from the screen, but only just", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const rail = (await page.locator(".pixl-rail").boundingBox())!;
  const screen = (await page.locator(".pixl-screen").boundingBox())!;
  const share = rail.height / screen.height;

  expect(
    share,
    `rail is ${(share * 100).toFixed(0)}% of the screen`,
  ).toBeLessThan(1);
  expect(share).toBeGreaterThan(0.9);
  // Centred against it, so the inset is shared top and bottom.
  const above = rail.y - screen.y;
  const below = screen.y + screen.height - (rail.y + rail.height);
  expect(Math.abs(above - below)).toBeLessThanOrEqual(2);
});

/**
 * THE MARKER TRAVELS TO ITS DETENT; IT DOES NOT TELEPORT TO IT.
 *
 * The value steps in 8s, so a marker positioned straight from the value jumps
 * the whole gap between two stops. Measured before the fix: fourteen jumps of
 * 55px across a 660ms drag, with NOT ONE FRAME in between — the stepping is
 * right and stays, but a pointer that arrives without travelling reads as a
 * glitch rather than as a detent.
 *
 * Sampled per animation frame, because this is invisible to anything that only
 * looks at the start and the end state — which is what every other test here
 * does, and why this one existed only as a defect for a week.
 */
test("the marker travels between detents rather than jumping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const rail = page.locator(".pixl-rail");
  await rail.evaluate(() => {
    (window as unknown as { __y: number[] }).__y = [];
    const marker = document.querySelector(".pixl-rail .pixl-marker")!;
    const tick = () => {
      const box = marker.getBoundingClientRect();
      (window as unknown as { __y: number[] }).__y.push(box.y + box.height / 2);
      (window as unknown as { __raf: number }).__raf =
        requestAnimationFrame(tick);
    };
    tick();
  });

  // A deliberate, human-paced drag from the foot of the rail to its head.
  const groove = (await rail.locator(".pixl-groove").boundingBox())!;
  await page.mouse.move(
    groove.x + groove.width / 2,
    groove.y + groove.height - 20,
  );
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(
      groove.x + groove.width / 2,
      groove.y + groove.height - 20 - (i / 30) * (groove.height - 40),
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);

  const motion = await page.evaluate(() => {
    cancelAnimationFrame((window as unknown as { __raf: number }).__raf);
    const samples = (window as unknown as { __y: number[] }).__y;
    const steps: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const step = Math.abs(samples[i] - samples[i - 1]);
      if (step > 0.05) steps.push(step);
    }
    const lane = document
      .querySelector(".pixl-rail .pixl-marker-lane")!
      .getBoundingClientRect();
    // 14 stops, so 13 gaps.
    return { steps, detent: lane.height / 13 };
  });

  // It moved on a great many frames, not on the dozen the detents alone give.
  expect(motion.steps.length).toBeGreaterThan(40);
  // And no single frame covers a detent: that is precisely the teleport.
  expect(
    Math.max(...motion.steps),
    `largest single-frame move ${Math.max(...motion.steps).toFixed(1)}px against a ${motion.detent.toFixed(1)}px detent`,
  ).toBeLessThan(motion.detent * 0.6);
});

/**
 * THE TRAVEL CLOCK FOLLOWS THE DISTANCE — §5b's rule, applied because one fixed
 * clock cannot serve both of this control's jobs.
 *
 * Measured against a 55px detent: at 260ms a fast drag trails a whole detent
 * behind the finger, and at 90ms a click at the far end of the rail snaps
 * across instead of travelling. So a detent gets the floor and a long throw
 * gets a long glide.
 */
test("a long throw is given longer than a single detent", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const rail = page.locator(".pixl-rail");
  const slide = rail.locator(".pixl-marker-slide");
  const clock = () =>
    slide.evaluate(
      (el) => Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000,
    );

  await rail.locator(".pixl-range").focus();
  await rail.locator(".pixl-range").press("ArrowUp");
  const oneDetent = await clock();

  const groove = (await rail.locator(".pixl-groove").boundingBox())!;
  await page.mouse.click(groove.x + groove.width / 2, groove.y + 12);
  const acrossTheRail = await clock();

  expect(oneDetent).toBeGreaterThan(0);
  // A sweep of the whole scale is worth a good deal more than one step of it.
  expect(acrossTheRail).toBeGreaterThan(oneDetent * 1.8);

  // REDUCED MOTION TAKES IT ALL AWAY, and has to: the global guard is what
  // makes every clock on this board optional, and a duration set inline from a
  // component is the shape most likely to slip out from under it.
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await clock()).toBeLessThan(1);
});

/**
 * THE WHOLE SCALE IS IN THE CHANNEL, AND THE GLASS RIDES IN IT WITH THEM.
 *
 * This is the shape of the control, and the shape is what the last rebuild
 * changed: the numbers were engraved on the panel OUTBOARD of a narrow groove,
 * which is what forced the marker to be two mouldings — a blade in the slot,
 * bridged sideways to a lens over the number column. Anything that pushes a
 * part back out of the channel brings the bridge back with it, so all three
 * live here in one test.
 *
 * The nesting is also load-bearing at the ENDS, which is where it is invisible
 * until it is wrong: the marker travels flush into the groove's round-over, so
 * a capsule radius — which is what this had — leaves the frame's corners
 * hanging outside the slot they are seated in.
 */
test("the scale, the marks and the glass are all inside the channel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const rail = page.locator(".pixl-rail");
  const input = rail.locator(".pixl-range");

  // The old build's parts are gone, not merely restyled. An arm bridging to a
  // plate is the thing this shape exists to have removed.
  await expect(rail.locator(".pixl-marker-arm")).toHaveCount(0);
  await expect(rail.locator(".pixl-marker-plate")).toHaveCount(0);

  // BOTH EXTREMES AND THE MIDDLE — the marker is flush with the groove's ends
  // at 16 and 120, which is exactly where a corner radius shows.
  for (const value of ["16", "56", "120"] as const) {
    await input.evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await page.evaluate(() =>
      Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      ),
    );

    const inside = await rail.evaluate((el) => {
      const groove = el.querySelector(".pixl-groove")!.getBoundingClientRect();
      const within = (b: DOMRect) => [
        b.x - groove.x,
        groove.right - b.right,
        b.y - groove.y,
        groove.bottom - b.bottom,
      ];
      return {
        marker: within(
          el.querySelector(".pixl-marker")!.getBoundingClientRect(),
        ),
        numbers: [...el.querySelectorAll(".pixl-scale-mark")].map((n) =>
          within(n.getBoundingClientRect()),
        ),
        arms: [...el.querySelectorAll(".pixl-groove-arm")].map((n) =>
          within(n.getBoundingClientRect()),
        ),
      };
    });

    expect(
      Math.min(...inside.marker),
      `at ${value}: glass outside the groove by ${-Math.min(...inside.marker)}px`,
    ).toBeGreaterThanOrEqual(-0.5);
    // AND SEATED, not filling it: floor still shows either side, which is what
    // says the glass is in a channel rather than being the channel.
    expect(Math.min(inside.marker[0], inside.marker[1])).toBeGreaterThan(2);

    for (const n of [...inside.numbers, ...inside.arms]) {
      expect(Math.min(...n)).toBeGreaterThanOrEqual(-0.5);
    }
  }

  /* AND THE CORNERS NEST, which no bounding box can tell you. The marker's end
     is flush with the groove's at 16 and at 120, so at that end the groove is
     only `width/2 - radius` wide while the marker is `width/2 - its own
     radius` — the frame hangs out of the slot unless
     `grooveRadius <= markerRadius + the floor either side`. A capsule is what
     this had (`999px`, used as 30 against a slack of 12), and the rectangles
     above go on passing through the whole defect. */
  const corners = await rail.evaluate((el) => {
    const fit = (node: Element) => {
      const box = node.getBoundingClientRect();
      return {
        radius: Math.min(
          Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
          box.width / 2,
          box.height / 2,
        ),
        width: box.width,
      };
    };
    return {
      groove: fit(el.querySelector(".pixl-groove")!),
      marker: fit(el.querySelector(".pixl-marker")!),
    };
  });
  const slack = (corners.groove.width - corners.marker.width) / 2;
  expect(
    corners.groove.radius,
    `groove radius ${corners.groove.radius} vs marker ${corners.marker.radius} + ${slack} of floor`,
  ).toBeLessThanOrEqual(corners.marker.radius + slack);

  /* THE GRADUATION FLANKS ITS NUMBER — beside it, never above or below. Two
     arms at the number's own height, one to each side. Stacking them reads as
     rows rather than as a scale, and it passes every containment check above,
     so it takes its own assertion. */
  const flank = await rail.evaluate((el) => {
    const mid = (b: DOMRect) => b.y + b.height / 2;
    return [...el.querySelectorAll(".pixl-scale-mark")].map((n) => {
      const number = n.getBoundingClientRect();
      const near = [...el.querySelectorAll(".pixl-groove-arm")]
        .map((a) => a.getBoundingClientRect())
        .filter((a) => Math.abs(mid(a) - mid(number)) <= 1);
      return {
        left: near.filter((a) => a.right <= number.x + 0.5).length,
        right: near.filter((a) => a.x >= number.right - 0.5).length,
      };
    });
  });
  expect(flank).toHaveLength(14);
  for (const [i, pair] of flank.entries()) {
    expect(pair, `number ${i} is not flanked`).toEqual({ left: 1, right: 1 });
  }

  // Every printed number looks the same: the glass is the only emphasis.
  const weights = await page.$$eval(".pixl-rail .pixl-scale-mark", (nodes) =>
    nodes.map((n) => {
      const cs = getComputedStyle(n);
      return `${cs.fontWeight}/${cs.color}`;
    }),
  );
  expect(new Set(weights).size).toBe(1);
});

for (const theme of ["light", "dark"] as const) {
  test(`the marker and the ruler read on the groove — ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("pixle-theme", t);
      } catch {}
    }, theme);
    await page.goto("/");

    const tones = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const rgb = (value: string) => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.documentElement.append(probe);
        const parts = getComputedStyle(probe)
          .color.replace(/[^\d,.]/g, "")
          .split(",")
          .map(Number);
        probe.remove();
        return parts;
      };

      // The keyline's alpha, read off the ELEMENT that draws it rather than
      // retyped here — a seam that quietly thinned would still pass otherwise.
      // It moved from the native thumb onto the marker when the marker stopped
      // being a pseudo-element, and off the plate onto the frame itself when
      // the plate was deleted with the arm — so this reads a real computed
      // style rather than walking the stylesheet. Serialised colour-first: the
      // seam is `rgba(0, 0, 0, 0.45) 0px 0px 0px 1px inset`.
      const frame = document.querySelector(".pixl-rail .pixl-marker")!;
      const keyline = Number(
        /rgba\(0, 0, 0, ([\d.]+)\) 0px 0px 0px 1px inset/.exec(
          getComputedStyle(frame).boxShadow,
        )?.[1] ?? 0,
      );

      const lens = getComputedStyle(
        document.querySelector(".pixl-rail .pixl-marker-lens")!,
      );
      return {
        indicator: rgb(root.getPropertyValue("--indicator")).slice(0, 3),
        floor: rgb(root.getPropertyValue("--strip")).slice(0, 3),
        ruler: rgb(root.getPropertyValue("--ruler")),
        keyline,
        // A window, not a plate — see the assertion for why that matters.
        lensFill: lens.backgroundColor,
        // The rail's printed numbers, and the surface they are engraved into
        // — the GROOVE'S FLOOR since the scale moved into the channel, not the
        // chassis panel they used to sit beside. Reading the old ground would
        // go on passing while the real pairing drifted.
        numberInk: rgb(
          getComputedStyle(
            document.querySelector(".pixl-rail .pixl-scale-mark")!,
          ).color,
        ).slice(0, 3),
        panel: rgb(root.getPropertyValue("--strip")).slice(0, 3),
      };
    });

    const linear = (v: number) =>
      v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
    const luminance = ([r, g, b]: number[]) =>
      0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    const ratio = (a: number[], b: number[]) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    // A translucent ink means nothing until it is composited onto its ground.
    const over = (fg: number[], alpha: number, bg: number[]) =>
      fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

    const fill = ratio(tones.indicator, tones.floor);
    expect(tones.keyline).toBeGreaterThan(0);
    const seam = ratio(
      over([0, 0, 0], tones.keyline, tones.indicator),
      tones.floor,
    );

    // ONE of the two, not both: the fill carries it where the groove is dark
    // and the seam carries it where the groove is silver.
    expect(
      Math.max(fill, seam),
      `${theme}: marker fill ${fill.toFixed(2)}:1, keyline ${seam.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3);

    // The graduations are the scale itself, so they get the full bar. Their
    // alpha is solved for it — 0.3 came to 1.94:1 on the pale floor.
    const [r, g, b, alpha] = tones.ruler;
    const ruler = ratio(over([r, g, b], alpha ?? 1, tones.floor), tones.floor);
    expect(
      ruler,
      `${theme}: ruler on the groove is ${ruler.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3);

    // THE LENS MUST NOT PAINT ITS OWN GROUND. It was a lit white face carrying
    // a copy of the value for a pass, and both halves of that were wrong: a
    // filled window hides the number it exists to show, and a white part sits
    // ON the chassis rather than being a window onto it.
    expect(tones.lensFill).toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);

    // THE PRINTED NUMBERS ARE THE RAIL'S ONLY READOUT now that the lens prints
    // nothing, so they take the text bar against the floor they lie on.
    const number = ratio(tones.numberInk, tones.panel);
    expect(
      number,
      `${theme}: the rail's numbers on the groove floor are ${number.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });
}
