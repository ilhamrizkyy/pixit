/**
 * Stroke model for drag-fill and slide-to-clear (INTERACTION.md §1, §3).
 *
 * Settled: the mode is decided ON PRESS and does not change mid-drag. Press an
 * empty cell -> the whole stroke paints. Press a filled cell -> the whole
 * stroke erases. This is what stops a drag from flickering between painting
 * and erasing as it crosses mixed cells.
 *
 * Every function here is pure: same cells in, same cells out, no mutation of
 * the input. Presentation owns the pointer; this module owns what a pointer
 * path MEANS.
 */

import { CELL_COUNT, GRID_SIZE } from "./constants";
import type { Cells } from "./types";
import { clearCell, fillCell, toCoords, toIndex } from "./grid";

export type StrokeMode = "paint" | "erase";

/**
 * RESOLVED 2026-08-18 (BACKLOG.md C) — a paint stroke crossing an already
 * filled cell OVERWRITES it with the current color. This is what the v9
 * prototype always did (`applyCell` assigned unconditionally).
 *
 * It stays a parameter rather than being inlined so the alternative remains one
 * argument away, and so the tests can pin both behaviours.
 */
export const DEFAULT_OVERWRITE_FILLED = true;

/** Which mode a press starts, given the cell pressed. */
export function strokeModeForPress(cells: Cells, index: number): StrokeMode {
  return cells[index] === null ? "paint" : "erase";
}

/** The cell reflected across the vertical centre line. Its own inverse. */
export function mirrorIndex(index: number): number {
  const { row, col } = toCoords(index);
  return toIndex(row, GRID_SIZE - 1 - col);
}

/** Apply one cell of an in-progress stroke. */
export function applyStrokeCell(
  cells: Cells,
  index: number,
  mode: StrokeMode,
  color: string,
  overwriteFilled: boolean = DEFAULT_OVERWRITE_FILLED,
): Cells {
  if (mode === "erase") return clearCell(cells, index);
  if (cells[index] !== null && !overwriteFilled) return cells;
  return fillCell(cells, index, color);
}

/**
 * Interpolate the cells a pointer crossed between two samples.
 *
 * CURRENTLY UNUSED: a drag fills a rectangle (see `cellsInRect`), not a line.
 * Retained, tested, and exported because it is the whole of a freehand mode —
 * if one is ever added as a tool toggle, this is the op it needs.
 *
 * Pointer events fire coarsely; a fast drag can jump several cells between
 * frames, leaving gaps in the stroke. This walks a Bresenham line so the paint
 * stays continuous at any drag speed.
 *
 * `from` is EXCLUDED and `to` INCLUDED: the origin cell was already painted
 * when the stroke reached it, and repainting it would be wasted work in the
 * common case and wrong in none.
 */
export function cellsBetween(from: number, to: number): number[] {
  if (!isCell(from) || !isCell(to)) {
    throw new RangeError(`cellsBetween: index out of range (${from} -> ${to})`);
  }
  if (from === to) return [];

  const a = toCoords(from);
  const b = toCoords(to);
  const dCol = Math.abs(b.col - a.col);
  const dRow = Math.abs(b.row - a.row);
  const stepCol = a.col < b.col ? 1 : -1;
  const stepRow = a.row < b.row ? 1 : -1;

  let error = dCol - dRow;
  let { row, col } = a;
  const path: number[] = [];

  // Bounded by construction: each iteration moves at least one axis toward the
  // target, so this cannot outrun the grid even on malformed input.
  while (row !== b.row || col !== b.col) {
    const doubled = error * 2;
    if (doubled > -dRow) {
      error -= dRow;
      col += stepCol;
    }
    if (doubled < dCol) {
      error += dCol;
      row += stepRow;
    }
    path.push(toIndex(row, col));
  }

  return path;
}

/**
 * Every cell in the axis-aligned rectangle spanned by two opposite corners,
 * both included.
 *
 * This is what a drag paints (INTERACTION.md §1). Corners are normalised, so
 * dragging up-left covers the same cells as dragging down-right — the rectangle
 * is defined by where the two ends ARE, not by the order they were visited.
 */
export function cellsInRect(from: number, to: number): number[] {
  if (!isCell(from) || !isCell(to)) {
    throw new RangeError(`cellsInRect: index out of range (${from} -> ${to})`);
  }
  const a = toCoords(from);
  const b = toCoords(to);
  const rowStart = Math.min(a.row, b.row);
  const rowEnd = Math.max(a.row, b.row);
  const colStart = Math.min(a.col, b.col);
  const colEnd = Math.max(a.col, b.col);

  const cells: number[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) cells.push(toIndex(row, col));
  }
  return cells;
}

export type StrokeOptions = {
  mode: StrokeMode;
  color: string;
  /** Mirror aid (INTERACTION.md §1): paint the reflected cell too. */
  mirror?: boolean;
  overwriteFilled?: boolean;
};

/**
 * Apply a run of cells as one stroke segment.
 *
 * Returns the SAME array when nothing changed, so a drag that re-enters cells
 * it already painted costs no allocation and triggers no re-render.
 */
export function applyStroke(
  cells: Cells,
  indices: readonly number[],
  { mode, color, mirror = false, overwriteFilled }: StrokeOptions,
): Cells {
  let next = cells;
  for (const index of indices) {
    next = applyStrokeCell(next, index, mode, color, overwriteFilled);
    if (mirror) {
      next = applyStrokeCell(next, mirrorIndex(index), mode, color, overwriteFilled);
    }
  }
  return next;
}

/**
 * Slide-to-clear (INTERACTION.md §3): everything in columns 0..through is
 * erased, the rest is untouched.
 *
 * Deliberately takes the column rather than a delta, so it is IDEMPOTENT — the
 * presentation can call it on every pointer frame against the pre-drag cells
 * without the wipe compounding. Dragging back leftward does not restore paint,
 * because the caller tracks the furthest column reached, not the current one:
 * a real Etch A Sketch does not un-erase either.
 *
 * `through` below 0 is a no-op, which is the handle's resting position.
 */
export function wipeThroughColumn(cells: Cells, through: number): Cells {
  if (through < 0) return cells;
  const limit = Math.min(through, GRID_SIZE - 1);

  let next = cells;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col <= limit; col++) {
      next = clearCell(next, toIndex(row, col));
    }
  }
  return next;
}

function isCell(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < CELL_COUNT;
}
