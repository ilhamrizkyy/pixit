import { expect, test, type Page } from "@playwright/test";

/**
 * Text contrast on surfaces axe structurally cannot check.
 *
 * axe refuses to judge contrast whenever an element's background is an image —
 * a gradient counts — and files those nodes under `incomplete` rather than
 * `violations`. The gallery has 32 such nodes: the nav and the sidebar are
 * built from the toy's layered gradients, so the whole blue surface of the
 * product sits in axe's blind spot while `expect(violations).toEqual([])`
 * passes over it in silence.
 *
 * That was measured, not assumed. Setting the tab ink to a mid blue at 1.44:1
 * left every axe scan green, on desktop and at phone width both.
 *
 * So this resolves the background the browser will actually paint — every
 * `color-mix()` is already expanded by the time it reaches `getComputedStyle`
 * — and checks the ink against each stop. The lightest stop is the worst case
 * for light ink and is exactly the one a hand check misses, because it is the
 * one written as a mix rather than as a hex.
 */

const AA = 4.5;

type Rgba = [number, number, number, number];

/** Every colour a resolved background names, as [r,g,b,a].
 *
 *  Three serialisations, all real: plain values come back `rgb(…)`, stops
 *  written as `color-mix()` come back `color(srgb 0.27 0.36 0.81)`, and a flat
 *  fill is on `background-color` rather than in the gradient at all. */
function colorsIn(value: string): Rgba[] {
  const found: Rgba[] = [];

  for (const match of value.matchAll(/rgba?\(([^)]+)\)/g)) {
    const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      found.push([parts[0], parts[1], parts[2], parts[3] ?? 1]);
    }
  }

  for (const match of value.matchAll(/color\(srgb ([^)]+)\)/g)) {
    const parts = match[1].split(/[\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      found.push([parts[0] * 255, parts[1] * 255, parts[2] * 255, parts[3] ?? 1]);
    }
  }

  return found;
}

/**
 * Flatten a background stack into the opaque colours text can actually land on.
 *
 * A TRANSLUCENT STOP IS NOT ITS OWN COLOUR. The sidebar's crown highlight is
 * `rgb(255 255 255 / 0.19)`, and reading that as white said the muted label
 * scored 1.46:1 when what is painted there is a pale blue. Every partial stop
 * is composited over the base — the last opaque colour in the stack, since CSS
 * paints the first-listed layer on top — which is what the browser does.
 *
 * Approximate in one direction: a translucent overlay is composited over the
 * base's DARKEST stop rather than over whatever sits locally beneath it, so an
 * overlay can read slightly darker here than on screen. The explicit stops —
 * which is where the real failures have been — are exact.
 */
function opaqueGrounds(stack: Rgba[]): [number, number, number][] {
  const base = [...stack].reverse().find((c) => c[3] >= 1);
  const grounds: [number, number, number][] = [];

  for (const [r, g, b, a] of stack) {
    if (a <= 0) continue;
    if (a >= 1) {
      grounds.push([r, g, b]);
    } else if (base !== undefined) {
      grounds.push([
        a * r + (1 - a) * base[0],
        a * g + (1 - a) * base[1],
        a * b + (1 - a) * base[2],
      ]);
    }
  }

  return grounds;
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(
  ink: [number, number, number],
  ground: [number, number, number],
) {
  const [hi, lo] = [luminance(ink), luminance(ground)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Ink and ground are read from DIFFERENT elements wherever the text does not
 * paint its own background — a nav link sits on the brow, not on itself, and
 * reading its own (transparent) background is how this test would silently
 * measure nothing.
 */
const SURFACES = [
  // The nav stopped being the bezel's brow on 2026-08-29, so it is plain shell
  // again — but it is still measured here, because axe reads a link's contrast
  // against its own transparent background and would find nothing.
  { name: "nav link", ink: "nav a", ground: "nav" },
  {
    name: "sidebar label",
    ink: ".pixl-pad .text-text-muted",
    // The pad, not the body: a label sits on the raised boss painted over it.
    ground: ".pixl-pad",
  },
  // The Shape drum. Its faces carry WORDS, so this is plain text contrast —
  // a higher bar than the 3:1 the glyphs they replaced were held to.
  //
  // THE GROUND IS THE PAPER, not the face and not the window. The paper is one
  // smooth cylinder painted across the opening — a face that carried its own
  // plastic put a bump at every join — so the names are printed on it and that
  // is what they have to be read against.
  //
  // `.pixl-thumb-paper` rather than `.pixl-thumb-window` since 2026-08-30: the
  // window is the CUT through the panel and paints the chassis walls of the
  // hole, which is what makes the paper read as sunken. Reading it would
  // measure a wall no text sits on.
  //
  // The GLASS over the opening is deliberately not in the ground. It darkens
  // both ends of the window hard, and what is there is a face turned 30 degrees
  // off the front and half out of the opening — the live value sits in the lit
  // middle, where the cover is clear. Measuring the ends would hold a rolling
  // drum to the bar for text you cannot read on any device that has one.
  //
  // ONE INK FOR EVERY FACE, so one entry. It ran as two — a held-back ink for
  // the values turning away — and this bar is what refused it: at the paper's
  // shaded end even a fully opaque held-back ink came to 4.47:1, so no alpha
  // cleared AA. Printing does not get fainter as a drum turns; the surface goes
  // into shadow and takes the printing with it. axe never looks either way: the
  // ground is a gradient under a 3D transform.
  {
    name: "drum face",
    ink: '[role="radiogroup"] .pixl-drum-face',
    ground: ".pixl-thumb-paper",
  },
  // The category tints followed the taxonomy to the chips. A SELECTED chip is
  // filled with its tint, so ink and ground are both on it; an unselected one
  // is transparent, so its ground is the screen it is drawn on.
  {
    name: "selected category chip",
    ink: '.pixl-chip[aria-selected="true"]',
    ground: '.pixl-chip[aria-selected="true"]',
  },
  {
    name: "unselected category chip",
    ink: '.pixl-chip:not([aria-selected="true"])',
    ground: ".pixl-screen",
  },
  // The hex readout, which is a segment panel rather than a field: its ink is
  // inherited from `.pixl-lcd` and its ground is a gradient with a glass wash
  // over it, so both halves are in axe's blind spot.
  // `.pixl-lcd-digits`, NOT the input: the input paints nothing (its glyphs are
  // drawn by the layer over it, which is what gives them per-character boxes to
  // animate), so its own `color` is `transparent` and reading it would measure
  // a colour nobody sees.
  { name: "hex readout", ink: ".pixl-lcd-digits", ground: ".pixl-lcd" },
  // The detail bar is a raised boss in the toy's own gradient, so every label
  // on it is in axe's blind spot the same way the sidebar's are.
  {
    name: "detail bar readout",
    ink: ".pixl-detailbar .text-text-muted",
    ground: ".pixl-detailbar",
  },
  { name: "detail bar name", ink: ".pixl-detailbar h2", ground: ".pixl-detailbar" },
] as const;

async function readSurface(page: Page, inkSel: string, groundSel: string) {
  return page.evaluate(
    ([ink, ground]) => {
      const inkNode = document.querySelector(ink);
      const groundNode = document.querySelector(ground);
      if (inkNode === null || groundNode === null) return null;
      const groundStyle = getComputedStyle(groundNode);
      return {
        color: getComputedStyle(inkNode).color,
        // The grain is a noise texture carrying no colour stops of its own.
        image: groundStyle.backgroundImage.replace(/url\("[^"]*"\)/g, ""),
        fill: groundStyle.backgroundColor,
      };
    },
    [inkSel, groundSel] as const,
  );
}

for (const theme of ["light", "dark"] as const) {
  test(`text clears AA on every gradient and card surface (${theme})`, async ({
    page,
  }) => {
    await page.goto("/");
    // The detail bar exists only while an icon is loaded, and half these
    // surfaces are on it.
    await page.getByRole("button", { name: /arrow-right/ }).first().click();
    await page.evaluate(
      (t) => document.documentElement.setAttribute("data-theme", t),
      theme,
    );

    /* LET THE THEME LAND BEFORE READING IT.
       Flipping `data-theme` starts a 150ms background-color transition on every
       tinted chip, and `getComputedStyle` reads whatever frame it lands on. It
       caught a selected chip at rgb(122,122,125) — a colour that exists nowhere
       in either palette, being halfway between the light tint and the dark one
       — and reported a 2.90:1 failure against a pairing that is really 11:1.
       CSS transitions are in `getAnimations()`, so they can be awaited. */
    await page.evaluate(
      () =>
        Promise.race([
          Promise.all(
            document.getAnimations().map((a) => a.finished.catch(() => {})),
          ),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]),
    );

    for (const { name, ink: inkSel, ground: groundSel } of SURFACES) {
      const surface = await readSurface(page, inkSel, groundSel);
      expect(surface, `${name}: "${inkSel}" or "${groundSel}" is not on the page`)
        .not.toBeNull();
      const { color, image, fill } = surface!;

      /* THE INK'S ALPHA IS PART OF THE INK. It was dropped here — read as
         `[r, g, b]` and measured at full strength — which made this whole suite
         a no-op for anything written as `color-mix(…, transparent)`: the shape
         list's dimmed row measured its token instead of what is painted, and
         passed at an alpha that really comes to 1.99:1. `opaqueGrounds` has
         composited the BACKGROUND's partial stops since it was written; the
         foreground needed the same treatment and never got it. */
      const ink = colorsIn(color)[0];
      const grounds = opaqueGrounds([...colorsIn(image), ...colorsIn(fill)]);

      // Without these two, a refactor that made a background transparent would
      // turn this whole test into a green no-op rather than a failure.
      expect(ink, `${name}: unreadable colour "${color}"`).toBeDefined();
      expect(
        grounds.length,
        `${name}: no background colour in "${image}" / "${fill}"`,
      ).toBeGreaterThan(0);

      for (const ground of grounds) {
        const alpha = ink[3];
        const painted = [0, 1, 2].map(
          (i) => ink[i] * alpha + ground[i] * (1 - alpha),
        ) as [number, number, number];
        const value = contrast(painted, ground);
        expect(
          value,
          `${name} (${theme}): ${color} on rgb(${ground.map(Math.round)}) is ${value.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA);
      }
    }
  });
}

/**
 * THE COMPOSER'S TOOL BUTTONS, on their own route.
 *
 * They wore `--frame-3` for their ink — the chassis's DEEPEST tone, which
 * inverts with the theme — on a cap whose face is a light dome in both. So in
 * light mode every glyph on the toy was painted a pale silver on white and read
 * correctly only in dark. `.pixl-key` was corrected for exactly this and this
 * class was missed, which is the argument for measuring it rather than
 * eyeballing it: a wrong ink on a gradient is invisible to axe and, at 3:1-ish,
 * nearly invisible to a person who already knows what the glyph says.
 */
const TOY_SURFACES = [
  { name: "tool button", sel: ".toy-button:not([aria-pressed='true'])" },
  { name: "latched tool button", sel: ".toy-button[aria-pressed='true']" },
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`the toy's tool glyphs clear AA on their own caps (${theme})`, async ({
    page,
  }) => {
    await page.goto("/create");
    await expect(page.getByRole("application", { name: /Drawing grid/ })).toBeVisible();
    await page.evaluate(
      (t) => document.documentElement.setAttribute("data-theme", t),
      theme,
    );
    await page.evaluate(
      () =>
        Promise.race([
          Promise.all(
            document.getAnimations().map((a) => a.finished.catch(() => {})),
          ),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]),
    );

    for (const { name, sel } of TOY_SURFACES) {
      const surface = await readSurface(page, sel, sel);
      expect(surface, `${name}: "${sel}" is not on the page`).not.toBeNull();
      const { color, image, fill } = surface!;
      const inkRgba = colorsIn(color)[0];
      expect(inkRgba, `${name}: unreadable colour "${color}"`).toBeDefined();
      const ink: [number, number, number] = [inkRgba[0], inkRgba[1], inkRgba[2]];
      const grounds = opaqueGrounds([...colorsIn(image), ...colorsIn(fill)]);
      expect(grounds.length, `${name}: no background in "${image}"`).toBeGreaterThan(0);

      for (const ground of grounds) {
        const value = contrast(ink, ground);
        expect(
          value,
          `${name} (${theme}): ${color} on rgb(${ground}) is ${value.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
