/**
 * Grid geometry. These numbers are load-bearing — CLAUDE.md rule 4 fixes the
 * grid at 11x11 on viewBox "0 0 44 44". Nothing should hardcode 11, 121, or 44
 * anywhere else in the codebase; import from here.
 */

/** Cells per side. */
export const GRID_SIZE = 11;

/** Total cells in an icon. 11 * 11. */
export const CELL_COUNT = GRID_SIZE * GRID_SIZE; // 121

/** SVG user units per cell. */
export const CELL_UNITS = 4;

/** Full canvas extent in SVG user units. 11 * 4. */
export const CANVAS_UNITS = GRID_SIZE * CELL_UNITS; // 44

/** The viewBox every exported icon carries. */
export const VIEW_BOX = `0 0 ${CANVAS_UNITS} ${CANVAS_UNITS}`;

/**
 * Safe area: a 9x9 live region inside the 11x11, leaving a symmetric 1-cell
 * margin on all four sides. 9 is the only inset that centers on an odd grid —
 * a 10x10 live area would leave 1 cell of total margin and sit off-center.
 */
export const SAFE_AREA_SIZE = 9;

/** First row/col index inside the safe area (inclusive). */
export const SAFE_AREA_MIN = (GRID_SIZE - SAFE_AREA_SIZE) / 2; // 1

/** Last row/col index inside the safe area (inclusive). */
export const SAFE_AREA_MAX = SAFE_AREA_MIN + SAFE_AREA_SIZE - 1; // 9

/**
 * Sizes the gallery offers. Multiples of 8, 16px floor (DESIGN.md §6,
 * INTERACTION.md §6).
 */
export const ICON_SIZES = [16, 24, 32, 40, 48] as const;

export type IconSize = (typeof ICON_SIZES)[number];

/** The size the gallery opens at. */
export const DEFAULT_ICON_SIZE: IconSize = 24;

/**
 * Padding is measured in CELLS and expands the viewBox outward, rather than
 * scaling the art down inside a fixed viewBox.
 *
 * That choice matters for pixel art: scaling would move cell edges off the
 * 4-unit grid and soften them. Growing the viewBox leaves every cell exactly
 * where it was and merely adds empty space around it, so the art stays crisp
 * and stays on-grid at any padding.
 */
export const PADDING_STEPS = [0, 1, 2, 3] as const;

/** viewBox for a given padding in cells. Padding 0 returns the base viewBox. */
export function viewBoxWithPadding(paddingCells: number): string {
  const pad = Math.max(0, paddingCells) * CELL_UNITS;
  if (pad === 0) return VIEW_BOX;
  const extent = CANVAS_UNITS + pad * 2;
  return `${-pad} ${-pad} ${extent} ${extent}`;
}
