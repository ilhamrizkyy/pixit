import { describe, expect, it } from "vitest";
import {
  GROUND_CROSSOVER,
  GROUND_LUMINANCE,
  galleryColorFromInput,
  groundFor,
  recolorCells,
  relativeLuminance,
} from "./color";
import { createEmptyCells, fillCell, toIndex } from "./grid";

const RED = "#ff0000";
const BLUE = "#0000ff";

describe("galleryColorFromInput", () => {
  it("normalizes what it accepts", () => {
    expect(galleryColorFromInput("F00")).toBe("#ff0000");
    expect(galleryColorFromInput("#00FF00")).toBe("#00ff00");
  });

  it("rejects partial input, so a half-typed hex never becomes a color", () => {
    expect(galleryColorFromInput("")).toBeNull();
    expect(galleryColorFromInput("ff00")).toBeNull();
  });
});

describe("recolorCells", () => {
  it("returns the SAME array when there is no color", () => {
    const cells = fillCell(createEmptyCells(), 0, RED);
    // The untinted path is the common one; it must not allocate.
    expect(recolorCells(cells, null)).toBe(cells);
  });

  it("replaces every filled cell with the one color", () => {
    let cells = createEmptyCells();
    cells = fillCell(cells, toIndex(0, 0), RED);
    cells = fillCell(cells, toIndex(1, 1), "#00ff00");

    const recolored = recolorCells(cells, BLUE);
    expect(recolored[toIndex(0, 0)]).toBe(BLUE);
    expect(recolored[toIndex(1, 1)]).toBe(BLUE);
  });

  it("leaves empty cells empty — backgrounds stay transparent", () => {
    const cells = fillCell(createEmptyCells(), 0, RED);
    const recolored = recolorCells(cells, BLUE);
    expect(recolored[1]).toBeNull();
    expect(recolored.filter((cell) => cell !== null)).toHaveLength(1);
  });

  it("never mutates the stored cells", () => {
    const cells = fillCell(createEmptyCells(), 0, RED);
    recolorCells(cells, BLUE);
    // The registry record is display-independent; this is CLAUDE.md rule 2.
    expect(cells[0]).toBe(RED);
  });
});

describe("the grid's ground follows the icon colour", () => {
  /**
   * The rule is in `groundFor`, and what is worth pinning is not that a given
   * hex maps to a given name — it is the three properties the rule has to keep,
   * because each one is a way the feature could be quietly wrong.
   */

  it("picks whichever ground the colour actually reads better on", () => {
    /* THE PROPERTY, NOT A TABLE. Asserting "#808080 is dark" pins today's
       crossover and says nothing about why; this recomputes the contrast
       against both candidates and requires the chosen one to win. It would
       catch an inverted comparison, a wrong luminance formula, or a crossover
       that drifted away from the grounds it was derived from. */
    const contrast = (a: number, b: number) =>
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

    for (const hex of [
      "#000000",
      "#ffffff",
      "#808080",
      "#2b5bff",
      "#16a34a",
      "#ffff00",
      "#7f7f7f",
      "#404040",
    ]) {
      const l = relativeLuminance(hex);
      const onLight = contrast(l, GROUND_LUMINANCE.light);
      const onDark = contrast(l, GROUND_LUMINANCE.dark);
      const better = onLight >= onDark ? "light" : "dark";
      expect(
        groundFor(hex),
        `${hex}: ${onLight.toFixed(2)}:1 on light vs ${onDark.toFixed(2)}:1 on dark`,
      ).toBe(better);
    }
  });

  it("NEVER FLIPS ON THE DEFAULTS, which is what makes it safe to ship", () => {
    /* The gallery's colour defaults to #000 in light and #fff in dark (§3), so
       a visitor who changes nothing has to get the ground their theme would
       have chosen anyway. If this ever fails, the feature is fighting the theme
       toggle rather than serving it, and every first visit sees a flip. */
    expect(groundFor("#000000")).toBe("light");
    expect(groundFor("#ffffff")).toBe("dark");
  });

  it("derives the crossover from the two grounds rather than storing it", () => {
    /* The constant is `sqrt((light + .05) * (dark + .05)) - .05`, which is where
       the two contrasts are equal. Recomputing it here means retuning either
       ground moves the test with the code — a hard-coded 0.1946 would keep
       passing while the grounds drifted out from under it. */
    const expected =
      Math.sqrt((GROUND_LUMINANCE.light + 0.05) * (GROUND_LUMINANCE.dark + 0.05)) -
      0.05;
    expect(GROUND_CROSSOVER).toBeCloseTo(expected, 10);

    // And it is genuinely between the two, or one ground is unreachable.
    expect(GROUND_CROSSOVER).toBeGreaterThan(GROUND_LUMINANCE.dark);
    expect(GROUND_CROSSOVER).toBeLessThan(GROUND_LUMINANCE.light);
  });

  it("matches the luminance of the tokens it claims to describe", () => {
    /* `GROUND_LUMINANCE` is written in the engine because the engine cannot
       read the DOM (TECH-STACK.md's one architectural rule), which means it can
       drift from `--grid-bg-light` / `--grid-bg-dark` in the stylesheet with
       nothing to notice. This is the seam, held the way `MAX_RENDERED_SIZE` and
       the grid's seat are held together. */
    // `--grid-card` in each theme: the surface icon art is actually drawn on.
    expect(relativeLuminance("#f6f6f6")).toBeCloseTo(GROUND_LUMINANCE.light, 6);
    expect(relativeLuminance("#1c1d21")).toBeCloseTo(GROUND_LUMINANCE.dark, 6);
  });
});
