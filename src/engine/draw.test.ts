import { describe, expect, it } from "vitest";
import { CELL_COUNT, GRID_SIZE } from "./constants";
import {
  clearColumns,
  createEmptyCells,
  fillCell,
  mirrorColumn,
  toCoords,
  toIndex,
} from "./grid";
import type { Cells } from "./types";
import {
  DEFAULT_OVERWRITE_FILLED,
  applyStroke,
  applyStrokeCell,
  cellsBetween,
  cellsInRect,
  mirrorIndex,
  strokeModeForPress,
  wipeThroughColumn,
} from "./draw";

const RED = "#ff0000";
const BLUE = "#2b5bff";

const LAST = GRID_SIZE - 1;
/** The one column that is its own mirror on an odd grid. */
const CENTER_COL = (GRID_SIZE - 1) / 2;

function at(cells: Cells, row: number, col: number) {
  return cells[toIndex(row, col)];
}

function paint(cells: Cells, coords: [number, number][], color = RED): Cells {
  return coords.reduce(
    (acc, [row, col]) => fillCell(acc, toIndex(row, col), color),
    cells,
  );
}

/** How far apart two cells sit when a diagonal step counts as one move. */
function chebyshev(a: number, b: number): number {
  const p = toCoords(a);
  const q = toCoords(b);
  return Math.max(Math.abs(p.row - q.row), Math.abs(p.col - q.col));
}

/**
 * Walk a path and report every step that is NOT a single move. A gap here is
 * the exact defect cellsBetween exists to prevent, so the failure message names
 * the offending pair rather than just reporting a boolean.
 */
function gapsIn(from: number, to: number): { path: number[]; gaps: string[] } {
  const path = cellsBetween(from, to);
  const full = [from, ...path];
  const gaps: string[] = [];
  for (let i = 1; i < full.length; i++) {
    const distance = chebyshev(full[i - 1], full[i]);
    if (distance !== 1) gaps.push(`${full[i - 1]} -> ${full[i]} (${distance})`);
  }
  return { path, gaps };
}

describe("DEFAULT_OVERWRITE_FILLED", () => {
  it("is overwrite", () => {
    // BACKLOG.md C, resolved 2026-08-18. Flipping this silently would change
    // what every drag in the composer means, so it is pinned here.
    expect(DEFAULT_OVERWRITE_FILLED).toBe(true);
  });
});

describe("strokeModeForPress", () => {
  it("paints from an empty cell and erases from a filled one", () => {
    const cells = paint(createEmptyCells(), [[3, 3]]);
    expect(strokeModeForPress(cells, toIndex(0, 0))).toBe("paint");
    expect(strokeModeForPress(cells, toIndex(3, 3))).toBe("erase");
  });

  it("does not mutate its input", () => {
    const cells = paint(createEmptyCells(), [[3, 3]]);
    const before = [...cells];
    strokeModeForPress(cells, toIndex(3, 3));
    expect(cells).toEqual(before);
  });
});

describe("mirrorIndex", () => {
  it("reflects across the vertical centre line", () => {
    expect(mirrorIndex(toIndex(0, 0))).toBe(toIndex(0, LAST));
    expect(mirrorIndex(toIndex(LAST, LAST))).toBe(toIndex(LAST, 0));
    expect(mirrorIndex(toIndex(4, 2))).toBe(toIndex(4, LAST - 2));
  });

  it("leaves the centre column where it is", () => {
    // Odd grid, so exactly one column is its own reflection; the mirror aid
    // must not double-paint or skip it.
    for (let row = 0; row < GRID_SIZE; row++) {
      const index = toIndex(row, CENTER_COL);
      expect(mirrorIndex(index)).toBe(index);
    }
  });

  it("is its own inverse for every cell on the grid", () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      expect(mirrorIndex(mirrorIndex(index))).toBe(index);
    }
  });

  it("stays on the same row and on the grid", () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      const mirrored = mirrorIndex(index);
      expect(mirrored).toBeGreaterThanOrEqual(0);
      expect(mirrored).toBeLessThan(CELL_COUNT);
      expect(toCoords(mirrored).row).toBe(toCoords(index).row);
    }
  });

  it("agrees with the grid module's mirrorColumn", () => {
    // Two implementations of one idea; this keeps them from drifting apart.
    for (let index = 0; index < CELL_COUNT; index++) {
      const { row, col } = toCoords(index);
      expect(mirrorIndex(index)).toBe(toIndex(row, mirrorColumn(col)));
    }
  });
});

describe("applyStrokeCell", () => {
  it("paints an empty cell", () => {
    const next = applyStrokeCell(createEmptyCells(), toIndex(2, 2), "paint", RED);
    expect(at(next, 2, 2)).toBe(RED);
  });

  it("overwrites a filled cell by default", () => {
    const cells = paint(createEmptyCells(), [[2, 2]], RED);
    const next = applyStrokeCell(cells, toIndex(2, 2), "paint", BLUE);
    expect(at(next, 2, 2)).toBe(BLUE);
  });

  it("leaves a filled cell alone when overwrite is off", () => {
    const cells = paint(createEmptyCells(), [[2, 2]], RED);
    const next = applyStrokeCell(cells, toIndex(2, 2), "paint", BLUE, false);
    expect(at(next, 2, 2)).toBe(RED);
    expect(next).toBe(cells);
  });

  it("erases a filled cell", () => {
    const cells = paint(createEmptyCells(), [[2, 2]]);
    const next = applyStrokeCell(cells, toIndex(2, 2), "erase", RED);
    expect(at(next, 2, 2)).toBeNull();
  });

  it("erasing an already empty cell leaves the grid equal", () => {
    const cells = paint(createEmptyCells(), [[2, 2]]);
    expect(applyStrokeCell(cells, toIndex(7, 7), "erase", RED)).toEqual(cells);
  });

  it("returns the same array for an index off the grid", () => {
    // A pointer that leaves the board mid-drag must not allocate or throw.
    const cells = paint(createEmptyCells(), [[2, 2]]);
    expect(applyStrokeCell(cells, CELL_COUNT, "paint", BLUE)).toBe(cells);
    expect(applyStrokeCell(cells, -1, "erase", BLUE)).toBe(cells);
  });

  it("does not mutate its input", () => {
    const cells = paint(createEmptyCells(), [[2, 2]]);
    const before = [...cells];
    applyStrokeCell(cells, toIndex(2, 2), "paint", BLUE);
    applyStrokeCell(cells, toIndex(2, 2), "erase", BLUE);
    expect(cells).toEqual(before);
  });
});

/**
 * Every shape of drag a pointer can produce. Pointer events fire coarsely, so
 * each of these can arrive as a single two-sample jump.
 */
const DRAG_SAMPLES: { name: string; from: number; to: number }[] = [
  { name: "pure horizontal, rightward", from: toIndex(5, 0), to: toIndex(5, LAST) },
  { name: "pure horizontal, leftward", from: toIndex(5, LAST), to: toIndex(5, 0) },
  { name: "pure vertical, downward", from: toIndex(0, 5), to: toIndex(LAST, 5) },
  { name: "pure vertical, upward", from: toIndex(LAST, 5), to: toIndex(0, 5) },
  { name: "perfect diagonal", from: toIndex(0, 0), to: toIndex(LAST, LAST) },
  { name: "perfect anti-diagonal", from: toIndex(0, LAST), to: toIndex(LAST, 0) },
  { name: "shallow, wider than tall", from: toIndex(1, 0), to: toIndex(4, LAST) },
  { name: "shallow, upward", from: toIndex(9, 1), to: toIndex(6, LAST) },
  { name: "steep, taller than wide", from: toIndex(0, 1), to: toIndex(LAST, 4) },
  { name: "steep, leftward", from: toIndex(0, 9), to: toIndex(LAST, 6) },
  { name: "one cell apart, orthogonal", from: toIndex(5, 5), to: toIndex(5, 6) },
  { name: "one cell apart, diagonal", from: toIndex(5, 5), to: toIndex(6, 6) },
];

describe("cellsBetween", () => {
  for (const { name, from, to } of DRAG_SAMPLES) {
    it(`leaves no gap on a ${name} drag`, () => {
      const { path, gaps } = gapsIn(from, to);
      expect(gaps).toEqual([]);
      expect(path[path.length - 1]).toBe(to);
      expect(path).not.toContain(from);
    });
  }

  it("leaves no gap between any two cells on the grid", () => {
    // The sampled shapes above are readable; this is the one that would catch a
    // Bresenham error term that only misbehaves at some specific slope.
    const broken: string[] = [];
    for (let from = 0; from < CELL_COUNT; from++) {
      for (let to = 0; to < CELL_COUNT; to++) {
        if (from === to) continue;
        const { path, gaps } = gapsIn(from, to);
        if (gaps.length > 0) broken.push(`${from}->${to}: ${gaps.join(", ")}`);
        if (path[path.length - 1] !== to) broken.push(`${from}->${to}: wrong end`);
        if (path.includes(from)) broken.push(`${from}->${to}: includes from`);
        if (new Set(path).size !== path.length) broken.push(`${from}->${to}: repeats`);
        const offGrid = path.filter(
          (index) => !Number.isInteger(index) || index < 0 || index >= CELL_COUNT,
        );
        if (offGrid.length > 0) broken.push(`${from}->${to}: off grid ${offGrid}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("excludes from and includes to", () => {
    // The origin was painted when the stroke reached it; repainting it is waste.
    expect(cellsBetween(toIndex(5, 0), toIndex(5, 3))).toEqual([
      toIndex(5, 1),
      toIndex(5, 2),
      toIndex(5, 3),
    ]);
  });

  it("is empty when the pointer has not left the cell", () => {
    expect(cellsBetween(toIndex(4, 4), toIndex(4, 4))).toEqual([]);
    expect(cellsBetween(0, 0)).toEqual([]);
    expect(cellsBetween(CELL_COUNT - 1, CELL_COUNT - 1)).toEqual([]);
  });

  it("throws RangeError on an index off the grid", () => {
    expect(() => cellsBetween(-1, 0)).toThrow(RangeError);
    expect(() => cellsBetween(0, -1)).toThrow(RangeError);
    expect(() => cellsBetween(CELL_COUNT, 0)).toThrow(RangeError);
    expect(() => cellsBetween(0, CELL_COUNT)).toThrow(RangeError);
  });

  it("throws RangeError on a non-integer index", () => {
    // A presentation layer that hands over a fractional cell has a bug; failing
    // loudly beats walking a line that never terminates on the target.
    expect(() => cellsBetween(1.5, 0)).toThrow(RangeError);
    expect(() => cellsBetween(0, 1.5)).toThrow(RangeError);
    expect(() => cellsBetween(Number.NaN, 0)).toThrow(RangeError);
    expect(() => cellsBetween(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("applyStroke", () => {
  it("paints every cell in the run", () => {
    const run = cellsBetween(toIndex(5, 0), toIndex(5, 4));
    const next = applyStroke(createEmptyCells(), run, { mode: "paint", color: RED });
    for (let col = 1; col <= 4; col++) expect(at(next, 5, col)).toBe(RED);
    expect(at(next, 5, 0)).toBeNull();
  });

  it("paints the reflected cell when mirror is on", () => {
    const next = applyStroke(createEmptyCells(), [toIndex(3, 1)], {
      mode: "paint",
      color: RED,
      mirror: true,
    });
    expect(at(next, 3, 1)).toBe(RED);
    expect(at(next, 3, LAST - 1)).toBe(RED);
  });

  it("mirroring the centre column paints one cell, not two", () => {
    const next = applyStroke(createEmptyCells(), [toIndex(3, CENTER_COL)], {
      mode: "paint",
      color: RED,
      mirror: true,
    });
    expect(next.filter((cell) => cell !== null)).toHaveLength(1);
  });

  it("mirrors an erase as well as a paint", () => {
    const cells = paint(createEmptyCells(), [
      [3, 1],
      [3, LAST - 1],
    ]);
    const next = applyStroke(cells, [toIndex(3, 1)], {
      mode: "erase",
      color: RED,
      mirror: true,
    });
    expect(at(next, 3, 1)).toBeNull();
    expect(at(next, 3, LAST - 1)).toBeNull();
  });

  it("keeps painting across a cell that was already filled", () => {
    // INTERACTION.md §1: the mode is fixed on press. Crossing a filled cell
    // must overwrite it, not flip the stroke into erasing from there on.
    const cells = paint(createEmptyCells(), [[5, 3]], BLUE);
    const run = cellsBetween(toIndex(5, 0), toIndex(5, 6));
    const next = applyStroke(cells, run, { mode: "paint", color: RED });
    for (let col = 1; col <= 6; col++) expect(at(next, 5, col)).toBe(RED);
  });

  it("keeps erasing across a cell that was already empty", () => {
    const cells = paint(createEmptyCells(), [
      [5, 1],
      [5, 5],
    ]);
    const run = cellsBetween(toIndex(5, 0), toIndex(5, 6));
    const next = applyStroke(cells, run, { mode: "erase", color: RED });
    expect(next.every((cell) => cell === null)).toBe(true);
  });

  it("returns the same array for an empty run", () => {
    const cells = paint(createEmptyCells(), [[5, 5]]);
    expect(applyStroke(cells, [], { mode: "paint", color: BLUE })).toBe(cells);
  });

  it("returns the same array when overwrite is off and every cell is filled", () => {
    const cells = paint(createEmptyCells(), [
      [5, 1],
      [5, 2],
    ]);
    const run = [toIndex(5, 1), toIndex(5, 2)];
    expect(
      applyStroke(cells, run, {
        mode: "paint",
        color: BLUE,
        overwriteFilled: false,
      }),
    ).toBe(cells);
  });

  it("returns the same array when a drag re-enters cells it already painted", () => {
    // applyStroke's own docstring: "Returns the SAME array when nothing
    // changed, so a drag that re-enters cells it already painted costs no
    // allocation and triggers no re-render." Repainting a cell with the colour
    // it already holds changes nothing, and neither does erasing an empty one.
    const painted = paint(createEmptyCells(), [[5, 5]], RED);
    expect(applyStroke(painted, [toIndex(5, 5)], { mode: "paint", color: RED })).toBe(
      painted,
    );
    expect(
      applyStroke(painted, [toIndex(1, 1)], { mode: "erase", color: RED }),
    ).toBe(painted);
  });

  it("does not mutate its input", () => {
    const cells = paint(createEmptyCells(), [[5, 3]], BLUE);
    const before = [...cells];
    applyStroke(cells, cellsBetween(toIndex(5, 0), toIndex(5, 6)), {
      mode: "paint",
      color: RED,
      mirror: true,
    });
    expect(cells).toEqual(before);
  });
});

describe("wipeThroughColumn", () => {
  /** Every cell painted — any surviving column is then unmistakable. */
  function full(): Cells {
    return new Array<string>(CELL_COUNT).fill(RED);
  }

  it("clears columns 0 through the given one and nothing beyond", () => {
    const next = wipeThroughColumn(full(), 3);
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= 3; col++) expect(at(next, row, col)).toBeNull();
      for (let col = 4; col < GRID_SIZE; col++) expect(at(next, row, col)).toBe(RED);
    }
  });

  it("is idempotent for the same column", () => {
    // The presentation calls this on every pointer frame against the pre-drag
    // cells; a compounding wipe would erase more than the handle has passed.
    const cells = full();
    const once = wipeThroughColumn(cells, 4);
    expect(wipeThroughColumn(once, 4)).toEqual(once);
    expect(wipeThroughColumn(wipeThroughColumn(cells, 4), 4)).toEqual(once);
  });

  it("takes a column, not a delta, so replaying frames is safe", () => {
    const cells = full();
    // Frames arriving as 0,1,2,3,4 against the pre-drag cells must land exactly
    // where a single frame at 4 would.
    let replayed = cells;
    for (let frame = 0; frame <= 4; frame++) {
      replayed = wipeThroughColumn(cells, frame);
    }
    expect(replayed).toEqual(wipeThroughColumn(cells, 4));
  });

  it("is a no-op below column 0", () => {
    const cells = full();
    // The handle's resting position, reported every frame until the drag moves.
    expect(wipeThroughColumn(cells, -1)).toBe(cells);
    expect(wipeThroughColumn(cells, -99)).toBe(cells);
  });

  it("clamps past the last column instead of running off the grid", () => {
    const next = wipeThroughColumn(full(), GRID_SIZE + 5);
    expect(next).toHaveLength(CELL_COUNT);
    expect(next.every((cell) => cell === null)).toBe(true);
  });

  it("clears everything at the last column", () => {
    expect(
      wipeThroughColumn(full(), GRID_SIZE - 1).every((cell) => cell === null),
    ).toBe(true);
  });

  it("agrees with the grid module's clearColumns", () => {
    // Two implementations of one wipe; this keeps them from drifting apart.
    const cells = full();
    for (let col = -1; col < GRID_SIZE; col++) {
      expect(wipeThroughColumn(cells, col)).toEqual(clearColumns(cells, col));
    }
  });

  it("does not mutate its input", () => {
    const cells = full();
    const before = [...cells];
    wipeThroughColumn(cells, 5);
    expect(cells).toEqual(before);
  });
});

describe("a whole drag gesture", () => {
  /** Press, then one coarse pointer sample, the way the composer drives it. */
  function drag(cells: Cells, from: number, to: number, color: string): Cells {
    const mode = strokeModeForPress(cells, from);
    const first = applyStrokeCell(cells, from, mode, color);
    return applyStroke(first, cellsBetween(from, to), { mode, color });
  }

  it("presses empty and paints straight over the filled cells it crosses", () => {
    const cells = paint(createEmptyCells(), [
      [5, 3],
      [5, 4],
    ], BLUE);
    const next = drag(cells, toIndex(5, 0), toIndex(5, 8), RED);
    for (let col = 0; col <= 8; col++) expect(at(next, 5, col)).toBe(RED);
    expect(at(next, 5, 9)).toBeNull();
  });

  it("presses filled and erases the whole path, painting nothing", () => {
    const cells = paint(createEmptyCells(), [
      [5, 0],
      [5, 4],
      [5, 8],
    ]);
    const next = drag(cells, toIndex(5, 0), toIndex(5, 8), BLUE);
    expect(next.every((cell) => cell === null)).toBe(true);
  });

  it("a fast diagonal jump paints an unbroken line", () => {
    const next = drag(createEmptyCells(), toIndex(0, 0), toIndex(LAST, LAST), RED);
    const filled = next
      .map((cell, index) => (cell === null ? -1 : index))
      .filter((index) => index >= 0);
    expect(filled).toHaveLength(GRID_SIZE);
    for (let i = 1; i < filled.length; i++) {
      expect(chebyshev(filled[i - 1], filled[i])).toBe(1);
    }
  });
});

describe("cellsInRect", () => {
  it("includes both corners and everything between", () => {
    const rect = cellsInRect(toIndex(1, 2), toIndex(3, 4));
    expect(rect).toHaveLength(3 * 3);
    expect(rect).toContain(toIndex(1, 2));
    expect(rect).toContain(toIndex(3, 4));
    expect(rect).toContain(toIndex(2, 3));
    expect(rect).not.toContain(toIndex(0, 2));
    expect(rect).not.toContain(toIndex(1, 5));
  });

  it("normalises corners in every direction", () => {
    const a = toIndex(1, 1);
    const b = toIndex(4, 5);
    const forward = [...cellsInRect(a, b)].sort((x, y) => x - y);
    for (const [from, to] of [
      [b, a],
      [toIndex(1, 5), toIndex(4, 1)],
      [toIndex(4, 1), toIndex(1, 5)],
    ]) {
      expect([...cellsInRect(from, to)].sort((x, y) => x - y)).toEqual(forward);
    }
  });

  it("is a single cell when both corners are the same", () => {
    expect(cellsInRect(60, 60)).toEqual([60]);
  });

  it("spans the whole board corner to corner", () => {
    expect(cellsInRect(0, CELL_COUNT - 1)).toHaveLength(CELL_COUNT);
  });

  it("throws rather than silently clamping an impossible index", () => {
    expect(() => cellsInRect(-1, 0)).toThrow(RangeError);
    expect(() => cellsInRect(0, CELL_COUNT)).toThrow(RangeError);
    expect(() => cellsInRect(1.5, 0)).toThrow(RangeError);
  });
});
