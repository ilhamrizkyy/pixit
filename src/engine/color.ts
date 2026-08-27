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

/** Presets row, including true black and true white (DESIGN.md §3). */
export const PRESET_COLORS: readonly string[] = [
  "#000000",
  "#ffffff",
  "#dc2626",
  "#d97706",
  "#eab308",
  "#16a34a",
  "#2b5bff",
  "#7c3aed",
  "#ec4899",
  "#71717a",
] as const;

/** The color a fresh composer session starts on. */
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
