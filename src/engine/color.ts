/**
 * Color model (INTERACTION.md §4) and the gallery tint.
 *
 * Still pure: culori is a math library with no DOM dependency, so the engine
 * boundary holds.
 *
 * THE RULE THIS MODULE SERVES: changing a color affects only the NEXT cells
 * drawn. Nothing here mutates an icon in the registry. `tintCells` returns a
 * NEW array for display; the stored icon and every export keep their baked
 * colors.
 */

import { converter, formatHex } from "culori";
import type { Cells } from "./types";
import { normalizeHex } from "./grid";

const toHsl = converter("hsl");

export type Hsl = {
  /** 0–360, wraps. Driven by the left knob. */
  h: number;
  /** 0–100. Driven by the saturation slider. */
  s: number;
  /** 0–100, black -> color -> white. Driven by the right knob. */
  l: number;
};

/**
 * What the composer opens on: fully saturated, lightness dead centre.
 *
 * Mid lightness matters more than the hue does — it is the one position where
 * the right knob can travel as far toward black as toward white, so the first
 * turn in either direction actually changes something. Opening near black (the
 * old #111111 sat at 7%) meant most of that knob's range was already spent.
 */
export const DEFAULT_HSL: Hsl = { h: 0, s: 100, l: 50 };

/** Derived, never written twice — the hex and the HSL cannot drift apart. */
export const DEFAULT_COLOR = hslToHex(DEFAULT_HSL);

/** HSL to a stored hex. */
export function hslToHex(hsl: Hsl): string {
  return formatHex({
    mode: "hsl",
    h: hsl.h,
    s: hsl.s / 100,
    l: hsl.l / 100,
  });
}

/**
 * Hex to HSL, so a typed hex can snap the knobs and slider to the nearest
 * match while the exact hex becomes the paint color (INTERACTION.md §4).
 *
 * Achromatic colors have no meaningful hue; culori reports it as undefined and
 * we report 0, which is the conventional stand-in.
 */
export function hexToHsl(hex: string): Hsl {
  const parsed = toHsl(hex);
  if (parsed === undefined) return { h: 0, s: 0, l: 0 };
  return {
    h: parsed.h ?? 0,
    s: (parsed.s ?? 0) * 100,
    l: parsed.l * 100,
  };
}

const HUE_NAMES: readonly [number, string][] = [
  [0, "Red"],
  [18, "Vermilion"],
  [35, "Orange"],
  [48, "Amber"],
  [60, "Yellow"],
  [90, "Lime"],
  [140, "Green"],
  [168, "Teal"],
  [186, "Cyan"],
  [205, "Sky"],
  [225, "Blue"],
  [255, "Indigo"],
  [278, "Violet"],
  [300, "Purple"],
  [322, "Magenta"],
  [338, "Pink"],
  [351, "Rose"],
  [360, "Red"],
];

/** Human-readable hue name for the color panel readout. */
export function hueName(hue: number): string {
  const normalized = ((hue % 360) + 360) % 360;
  let best = "Red";
  let bestDistance = Infinity;

  for (const [degrees, name] of HUE_NAMES) {
    const raw = Math.abs(normalized - degrees);
    const distance = Math.min(raw, 360 - raw);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }

  return best;
}

/* ============================================================================
   Gallery color — DISPLAY ONLY.

   One color applies to every filled cell of every icon, the way Lucide's
   customizer works. Structural detail carried by color contrast is lost by
   design, so icons meant to survive this are drawn as OUTLINES rather than as
   filled masses with internal color regions.

   Display only, always: the registry record is never modified, and Copy /
   Download always emit the icon's own baked colors.
   ========================================================================= */

/** Normalize a gallery color, or null when the input is not a usable hex. */
export function galleryColorFromInput(input: string): string | null {
  return normalizeHex(input);
}

/**
 * Recolor cells for display: every filled cell becomes `color`, empty cells
 * stay empty. Returns the ORIGINAL array when there is no color, so the
 * untinted path allocates nothing.
 */
export function recolorCells(cells: Cells, color: string | null): Cells {
  if (color === null) return cells;
  return cells.map((cell) => (cell === null ? null : color));
}

/* ═══ THE GRID'S GROUND FOLLOWS THE ICON COLOUR (2026-09-13) ═════════════════

   Phosphor's gallery does this and it is the right instinct: the one thing the
   page exists to show is drawn in a colour the visitor chooses, so the surface
   under it cannot be fixed. Pick white and a white-on-white grid shows nothing.

   THE RULE, IN FULL, because "flip when it is dark" is not specific enough to
   build from:

   1. Take the relative luminance of the display colour, WCAG's own formula —
      linearise each channel, then 0.2126R + 0.7152G + 0.0722B.
   2. There are exactly TWO candidate grounds, and they are not invented for
      this: they are the light theme's grid tone and the dark theme's. Both
      already exist, both are already paired with a card tone one step off them,
      and both have already been measured against every ink drawn on them.
   3. Compute the contrast of the colour against each, `(Lmax + .05) / (Lmin +
      .05)`, and take whichever is higher.

   THE CROSSOVER IS SOLVED, NOT PICKED. Setting the two contrasts equal:

       (L_light + .05) / (L + .05)  =  (L + .05) / (L_dark + .05)

   which gives `L = sqrt((L_light + .05)(L_dark + .05)) - .05`, or **0.1961**
   for the two card tones. Mid grey `#808080` sits at 0.2159 — just above — and
   measures 3.8:1 on the light card against 4.6:1 on the dark one, which is the
   answer the arithmetic gives and the one the eye agrees with.

   IT DOES NOT FIGHT THE THEME, and that is what makes it safe to ship. The
   default colour is #000 in light and #fff in dark (§3), so a visitor who
   changes nothing gets `L = 0` on a light ground and `L = 1` on a dark one —
   the ground the theme would have chosen anyway. Only a deliberate colour
   choice ever flips it, which is exactly when it is wanted.

   IT DRIVES THE WHOLE PAGE'S THEME (2026-09-13), and that made it smaller.

   For a few hours it flipped the icon panel's ground alone, scoped that tightly
   because inverting the surface under the seven category chips would have
   broken all fourteen of their measured tint pairings at once. Going page-wide
   removes that problem rather than routing around it: every token already has a
   per-theme value, so a real theme change carries the chips with it — which a
   panel-only flip could never do. The duplicated ground tokens and the separate
   grid ink went with the scoping.

   The theme toggle went too. It has nothing left to switch: the theme is a
   function of the colour, so the two cannot disagree, and asking for a dark
   page means asking for a light icon colour. That is a real loss of control and
   it is the feature as asked for rather than a gap — recorded so it is not
   rediscovered as a bug.
   ═════════════════════════════════════════════════════════════════════════ */

/** The two grounds an icon can be drawn on. Names, not colours: the values live
 *  in the stylesheet, so no hex ever reaches a component. */
export type Ground = "light" | "dark";

/** Relative luminance, WCAG 2.x. Expects `#rrggbb`. */
export function relativeLuminance(hex: string): number {
  const clean = normalizeHex(hex) ?? "#000000";
  const channel = (at: number) => {
    const v = Number.parseInt(clean.slice(at, at + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * The luminance of `--grid-card` in each theme, which are the two candidates.
 *
 * THE CARD, NOT THE PAGE, and the distinction matters. The theme flip changes
 * every surface, but the question this rule answers is narrower: will the ICON
 * read? Icon art lands on `--grid-card` and nowhere else in the grid, so that
 * is the surface the contrast is measured against. Using `--color-bg` would
 * measure a tone no icon is ever drawn on and move the crossover by a hair for
 * no reason anyone could name.
 *
 * Written here rather than read from the stylesheet on purpose: this is engine
 * code and the engine knows nothing about the DOM (TECH-STACK.md's one
 * architectural rule). A test holds these against the tokens so the two cannot
 * drift — the same arrangement `MAX_RENDERED_SIZE` and the grid's seat already
 * live under.
 */
export const GROUND_LUMINANCE: Record<Ground, number> = {
  light: 0.921_582, // #f6f6f6
  dark: 0.012_354, // #1c1d21
};

/**
 * Where the ground flips, derived from the two candidates above.
 *
 * Solving `1.05 / (L + .05) = (L + .05) / (dark + .05)` for L. Deriving it
 * rather than writing 0.1946 means retuning either ground moves the crossover
 * with it, instead of leaving a stale constant that is wrong by a little.
 */
export const GROUND_CROSSOVER =
  Math.sqrt(
    (GROUND_LUMINANCE.light + 0.05) * (GROUND_LUMINANCE.dark + 0.05),
  ) - 0.05;

/** Which ground gives the colour more contrast. */
export function groundFor(hex: string): Ground {
  return relativeLuminance(hex) > GROUND_CROSSOVER ? "dark" : "light";
}
