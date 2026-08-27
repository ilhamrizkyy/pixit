/**
 * Whole-drawing transforms (INTERACTION.md §2). Each is a one-shot, pure
 * remap of cell positions — colors ride along untouched, since nothing here
 * may recolor an existing cell (CLAUDE.md rule 2).
 */

import { GRID_SIZE } from "./constants";
import type { Cells } from "./types";
import { createEmptyCells, toIndex } from "./grid";

/** Remap helper: `source(row, col)` returns where the new cell reads from. */
function remap(
  cells: Cells,
  source: (row: number, col: number) => { row: number; col: number },
): Cells {
  const next = createEmptyCells();
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const from = source(row, col);
      next[toIndex(row, col)] = cells[toIndex(from.row, from.col)];
    }
  }
  return next;
}

/** Mirror across the vertical axis. */
export function flipHorizontal(cells: Cells): Cells {
  return remap(cells, (row, col) => ({ row, col: GRID_SIZE - 1 - col }));
}

/** Mirror across the horizontal axis. */
export function flipVertical(cells: Cells): Cells {
  return remap(cells, (row, col) => ({ row: GRID_SIZE - 1 - row, col }));
}

/**
 * Rotate 90° clockwise. The only rotation the toy offers — one press, one
 * quarter turn clockwise (INTERACTION.md §2). Counter-clockwise is three
 * presses, by design.
 */
export function rotateClockwise(cells: Cells): Cells {
  return remap(cells, (row, col) => ({ row: GRID_SIZE - 1 - col, col: row }));
}

/* ============================================================================
   Composed orientation.

   The composer applies transforms destructively, one press at a time. The
   gallery instead holds an orientation and derives the view from it, so
   "rotate" is reversible there without an undo stack.
   ========================================================================= */

export type Orientation = {
  flipH: boolean;
  flipV: boolean;
  /** Quarter turns clockwise. Any integer; normalized on apply. */
  rotations: number;
};

export const IDENTITY_ORIENTATION: Orientation = {
  flipH: false,
  flipV: false,
  rotations: 0,
};

export function isIdentityOrientation(orientation: Orientation): boolean {
  return (
    !orientation.flipH &&
    !orientation.flipV &&
    ((orientation.rotations % 4) + 4) % 4 === 0
  );
}

/**
 * Apply an orientation in a FIXED order — flips first, then rotation.
 *
 * The order is load-bearing: flip-then-rotate and rotate-then-flip give
 * different results, so pinning it here keeps the preview predictable as
 * controls are toggled in any sequence.
 */
export function applyOrientation(
  cells: Cells,
  orientation: Orientation,
): Cells {
  if (isIdentityOrientation(orientation)) return cells;

  let next = cells;
  if (orientation.flipH) next = flipHorizontal(next);
  if (orientation.flipV) next = flipVertical(next);

  const turns = ((orientation.rotations % 4) + 4) % 4;
  for (let turn = 0; turn < turns; turn++) next = rotateClockwise(next);

  return next;
}

/** Degrees for display, normalized to 0/90/180/270. */
export function rotationDegrees(orientation: Orientation): number {
  return (((orientation.rotations % 4) + 4) % 4) * 90;
}
