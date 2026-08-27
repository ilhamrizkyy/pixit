/**
 * Grid data operations. Every function here is pure: it returns new state and
 * never mutates its arguments, which is what makes undo/redo a matter of
 * keeping references rather than deep-cloning snapshots.
 */

import {
  CELL_COUNT,
  GRID_SIZE,
  SAFE_AREA_MAX,
  SAFE_AREA_MIN,
} from "./constants";
import type { CellColor, Cells, Coords } from "./types";

/** A blank 11x11 grid: 121 nulls. */
export function createEmptyCells(): Cells {
  return new Array<CellColor>(CELL_COUNT).fill(null);
}

/** Flat index for a row/col. Does not bounds-check; use `inBounds` first. */
export function toIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

/** Row/col for a flat index. */
export function toCoords(index: number): Coords {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

/** Whether a row/col lands on the grid at all. */
export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

/**
 * Whether a row/col sits inside the 9x9 safe area. Advisory in the composer —
 * the owner may draw to the edge; this exists to render the guide overlay and
 * to warn on save, not to block painting.
 */
export function inSafeArea(row: number, col: number): boolean {
  return (
    row >= SAFE_AREA_MIN &&
    row <= SAFE_AREA_MAX &&
    col >= SAFE_AREA_MIN &&
    col <= SAFE_AREA_MAX
  );
}

/** Structural check that an unknown value is a usable grid. */
export function isValidCells(value: unknown): value is Cells {
  return (
    Array.isArray(value) &&
    value.length === CELL_COUNT &&
    value.every((c) => c === null || (typeof c === "string" && isHex(c)))
  );
}

/** 6-digit hex with a leading #. The one color format stored on a cell. */
export function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** Normalize a hex to the stored form: leading #, lowercase, 6 digits. */
export function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "");
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  return `#${expanded.toLowerCase()}`;
}

/** Paint one cell. Returns new state; the input is untouched. */
export function fillCell(cells: Cells, index: number, color: string): Cells {
  if (index < 0 || index >= CELL_COUNT) return cells;
  // Painting a cell the colour it already holds is not a change. Returning the
  // same reference matters most during a drag, which re-enters cells it has
  // already painted on almost every pointer frame: a fresh array each time
  // would re-render the whole 121-cell grid for no visible difference.
  if (cells[index] === color) return cells;
  const next = cells.slice();
  next[index] = color;
  return next;
}

/** Empty one cell. */
export function clearCell(cells: Cells, index: number): Cells {
  if (index < 0 || index >= CELL_COUNT) return cells;
  if (cells[index] === null) return cells;
  const next = cells.slice();
  next[index] = null;
  return next;
}

/**
 * Tap behavior (INTERACTION.md §1): tap empty -> fill with the current color;
 * tap filled -> clear it. There is no separate eraser tool.
 */
export function toggleCell(cells: Cells, index: number, color: string): Cells {
  if (index < 0 || index >= CELL_COUNT) return cells;
  return cells[index] === null
    ? fillCell(cells, index, color)
    : clearCell(cells, index);
}

/** Wipe everything. */
export function clearAll(): Cells {
  return createEmptyCells();
}

/**
 * Erase every cell in columns 0..throughColumn inclusive.
 *
 * Backs the slide-to-clear groove (INTERACTION.md §3), which wipes
 * progressively by column following the handle rather than all at once. The UI
 * calls this repeatedly as the handle moves and commits ONE undo entry on
 * release.
 */
export function clearColumns(cells: Cells, throughColumn: number): Cells {
  if (throughColumn < 0) return cells;
  const limit = Math.min(throughColumn, GRID_SIZE - 1);
  const next = cells.slice();
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col <= limit; col++) {
      next[toIndex(row, col)] = null;
    }
  }
  return next;
}

/** True when nothing is painted. Save requires a non-empty drawing. */
export function isEmpty(cells: Cells): boolean {
  return cells.every((c) => c === null);
}

/** How many cells are painted. Not shown in the dock — the counter was cut. */
export function filledCount(cells: Cells): number {
  return cells.reduce<number>((n, c) => (c === null ? n : n + 1), 0);
}

/** Every distinct color used, in first-painted order. */
export function usedColors(cells: Cells): string[] {
  const seen = new Set<string>();
  for (const c of cells) if (c !== null) seen.add(c);
  return [...seen];
}

/**
 * Mirror a column index across the vertical center. Backs the Mirror drawing
 * aid (INTERACTION.md §1), which is live assistance only and is never stored
 * on the icon.
 */
export function mirrorColumn(col: number): number {
  return GRID_SIZE - 1 - col;
}
