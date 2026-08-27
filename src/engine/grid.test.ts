import { describe, expect, it } from "vitest";
import { CELL_COUNT, GRID_SIZE, SAFE_AREA_MAX, SAFE_AREA_MIN } from "./constants";
import {
  clearAll,
  clearCell,
  clearColumns,
  createEmptyCells,
  fillCell,
  filledCount,
  inBounds,
  inSafeArea,
  isEmpty,
  isHex,
  isValidCells,
  mirrorColumn,
  normalizeHex,
  toCoords,
  toIndex,
  toggleCell,
  usedColors,
} from "./grid";

const RED = "#ff0000";

describe("createEmptyCells", () => {
  it("is 121 nulls", () => {
    const cells = createEmptyCells();
    expect(cells).toHaveLength(CELL_COUNT);
    expect(cells.every((cell) => cell === null)).toBe(true);
  });

  it("returns a fresh array each call", () => {
    expect(createEmptyCells()).not.toBe(createEmptyCells());
  });
});

describe("coordinate mapping", () => {
  it("round-trips every index", () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      const { row, col } = toCoords(index);
      expect(toIndex(row, col)).toBe(index);
    }
  });

  it("places the last cell at the bottom-right", () => {
    expect(toCoords(CELL_COUNT - 1)).toEqual({
      row: GRID_SIZE - 1,
      col: GRID_SIZE - 1,
    });
  });
});

describe("inBounds", () => {
  it("accepts the corners and rejects just outside them", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(GRID_SIZE - 1, GRID_SIZE - 1)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, GRID_SIZE)).toBe(false);
  });
});

describe("inSafeArea", () => {
  it("spans a symmetric 9x9 with a one-cell margin", () => {
    expect(SAFE_AREA_MIN).toBe(1);
    expect(SAFE_AREA_MAX).toBe(9);
    expect(inSafeArea(1, 1)).toBe(true);
    expect(inSafeArea(9, 9)).toBe(true);
    // The margin ring is outside on every side — this is what a 10x10 live
    // area could not do on an odd grid.
    expect(inSafeArea(0, 5)).toBe(false);
    expect(inSafeArea(10, 5)).toBe(false);
    expect(inSafeArea(5, 0)).toBe(false);
    expect(inSafeArea(5, 10)).toBe(false);
  });
});

describe("hex handling", () => {
  it("accepts only 6-digit hex with a leading #", () => {
    expect(isHex("#ff0000")).toBe(true);
    expect(isHex("#FF0000")).toBe(true);
    expect(isHex("ff0000")).toBe(false);
    expect(isHex("#f00")).toBe(false);
  });

  it("expands 3-digit shorthand and lowercases", () => {
    expect(normalizeHex("f00")).toBe("#ff0000");
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("  #FF0000  ")).toBe("#ff0000");
  });

  it("returns null for anything unparseable", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#ff00")).toBeNull();
    expect(normalizeHex("nothex")).toBeNull();
  });
});

describe("isValidCells", () => {
  it("requires exactly CELL_COUNT entries of null or hex", () => {
    expect(isValidCells(createEmptyCells())).toBe(true);
    expect(isValidCells(fillCell(createEmptyCells(), 0, RED))).toBe(true);
    expect(isValidCells(new Array(CELL_COUNT - 1).fill(null))).toBe(false);
    expect(isValidCells(new Array(CELL_COUNT).fill("red"))).toBe(false);
    expect(isValidCells("not an array")).toBe(false);
  });
});

describe("cell mutation is immutable", () => {
  it("fillCell returns a new array and leaves the input alone", () => {
    const before = createEmptyCells();
    const after = fillCell(before, 5, RED);
    expect(after).not.toBe(before);
    expect(after[5]).toBe(RED);
    expect(before[5]).toBeNull();
  });

  it("clearCell empties one cell only", () => {
    const filled = fillCell(fillCell(createEmptyCells(), 5, RED), 6, RED);
    const cleared = clearCell(filled, 5);
    expect(cleared[5]).toBeNull();
    expect(cleared[6]).toBe(RED);
  });

  it("returns the SAME array when the write changes nothing", () => {
    // The identity guarantee a drag depends on: re-entering a painted cell,
    // or erasing an already-empty one, must not allocate.
    const painted = fillCell(createEmptyCells(), 5, RED);
    expect(fillCell(painted, 5, RED)).toBe(painted);
    expect(clearCell(painted, 6)).toBe(painted);
    // A genuine change still allocates.
    expect(fillCell(painted, 5, "#00ff00")).not.toBe(painted);
    expect(clearCell(painted, 5)).not.toBe(painted);
  });

  it("ignores out-of-range indices instead of growing the array", () => {
    const cells = createEmptyCells();
    expect(fillCell(cells, -1, RED)).toBe(cells);
    expect(fillCell(cells, CELL_COUNT, RED)).toBe(cells);
    expect(clearCell(cells, CELL_COUNT)).toBe(cells);
  });
});

describe("toggleCell", () => {
  it("fills an empty cell and clears a filled one — no separate eraser", () => {
    const empty = createEmptyCells();
    const filled = toggleCell(empty, 12, RED);
    expect(filled[12]).toBe(RED);
    expect(toggleCell(filled, 12, RED)[12]).toBeNull();
  });

  it("clears a filled cell even when the current color differs", () => {
    const filled = fillCell(createEmptyCells(), 12, RED);
    expect(toggleCell(filled, 12, "#00ff00")[12]).toBeNull();
  });
});

describe("clearColumns", () => {
  it("wipes columns 0..n inclusive across every row", () => {
    let cells = createEmptyCells();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        cells = fillCell(cells, toIndex(row, col), RED);
      }
    }

    const wiped = clearColumns(cells, 2);
    for (let row = 0; row < GRID_SIZE; row++) {
      expect(wiped[toIndex(row, 0)]).toBeNull();
      expect(wiped[toIndex(row, 2)]).toBeNull();
      expect(wiped[toIndex(row, 3)]).toBe(RED);
    }
  });

  it("clamps past the last column and no-ops below zero", () => {
    const cells = fillCell(createEmptyCells(), 0, RED);
    expect(isEmpty(clearColumns(cells, 999))).toBe(true);
    expect(clearColumns(cells, -1)).toBe(cells);
  });
});

describe("inspection helpers", () => {
  it("reports emptiness and count", () => {
    expect(isEmpty(createEmptyCells())).toBe(true);
    const one = fillCell(createEmptyCells(), 3, RED);
    expect(isEmpty(one)).toBe(false);
    expect(filledCount(one)).toBe(1);
    expect(filledCount(clearAll())).toBe(0);
  });

  it("lists distinct colors in first-painted order", () => {
    let cells = createEmptyCells();
    cells = fillCell(cells, 10, RED);
    cells = fillCell(cells, 2, "#00ff00");
    cells = fillCell(cells, 30, RED);
    // Row-major order, not insertion order: index 2 comes before index 10.
    expect(usedColors(cells)).toEqual(["#00ff00", RED]);
  });
});

describe("mirrorColumn", () => {
  it("reflects across the vertical centre, which is its own inverse", () => {
    expect(mirrorColumn(0)).toBe(GRID_SIZE - 1);
    expect(mirrorColumn(5)).toBe(5);
    expect(mirrorColumn(mirrorColumn(3))).toBe(3);
  });
});
