import { describe, expect, it } from "vitest";
import { GRID_SIZE } from "./constants";
import { createEmptyCells, fillCell, toIndex } from "./grid";
import type { Cells } from "./types";
import {
  IDENTITY_ORIENTATION,
  applyOrientation,
  flipHorizontal,
  flipVertical,
  isIdentityOrientation,
  rotateClockwise,
  rotationDegrees,
} from "./transform";

const MARK = "#111111";

/** A cell only in the top-left corner — enough to tell every transform apart. */
function corner(): Cells {
  return fillCell(createEmptyCells(), toIndex(0, 0), MARK);
}

function at(cells: Cells, row: number, col: number) {
  return cells[toIndex(row, col)];
}

const LAST = GRID_SIZE - 1;

describe("flipHorizontal", () => {
  it("mirrors across the vertical axis", () => {
    const flipped = flipHorizontal(corner());
    expect(at(flipped, 0, LAST)).toBe(MARK);
    expect(at(flipped, 0, 0)).toBeNull();
  });

  it("is its own inverse", () => {
    const cells = corner();
    expect(flipHorizontal(flipHorizontal(cells))).toEqual(cells);
  });
});

describe("flipVertical", () => {
  it("mirrors across the horizontal axis", () => {
    const flipped = flipVertical(corner());
    expect(at(flipped, LAST, 0)).toBe(MARK);
    expect(at(flipped, 0, 0)).toBeNull();
  });

  it("is its own inverse", () => {
    const cells = corner();
    expect(flipVertical(flipVertical(cells))).toEqual(cells);
  });
});

describe("rotateClockwise", () => {
  it("sends the top-left corner to the top-right", () => {
    expect(at(rotateClockwise(corner()), 0, LAST)).toBe(MARK);
  });

  it("returns to the start after four turns", () => {
    const cells = corner();
    let turned = cells;
    for (let turn = 0; turn < 4; turn++) turned = rotateClockwise(turned);
    expect(turned).toEqual(cells);
  });

  it("walks the corners clockwise, never counter-clockwise", () => {
    // One press must be a QUARTER TURN CLOCKWISE (INTERACTION.md §2).
    let cells = corner();
    cells = rotateClockwise(cells);
    expect(at(cells, 0, LAST)).toBe(MARK);
    cells = rotateClockwise(cells);
    expect(at(cells, LAST, LAST)).toBe(MARK);
    cells = rotateClockwise(cells);
    expect(at(cells, LAST, 0)).toBe(MARK);
  });

  it("does not mutate its input", () => {
    const cells = corner();
    rotateClockwise(cells);
    expect(at(cells, 0, 0)).toBe(MARK);
  });
});

describe("isIdentityOrientation", () => {
  it("treats any whole number of full turns as identity", () => {
    expect(isIdentityOrientation(IDENTITY_ORIENTATION)).toBe(true);
    expect(
      isIdentityOrientation({ flipH: false, flipV: false, rotations: 4 }),
    ).toBe(true);
    expect(
      isIdentityOrientation({ flipH: false, flipV: false, rotations: -8 }),
    ).toBe(true);
    expect(
      isIdentityOrientation({ flipH: true, flipV: false, rotations: 0 }),
    ).toBe(false);
  });
});

describe("applyOrientation", () => {
  it("returns the same array reference when nothing is set", () => {
    const cells = corner();
    // Identity must not allocate — the untransformed path is the common one.
    expect(applyOrientation(cells, IDENTITY_ORIENTATION)).toBe(cells);
  });

  it("applies flips before rotation, in that fixed order", () => {
    const cells = corner();
    const composed = applyOrientation(cells, {
      flipH: true,
      flipV: false,
      rotations: 1,
    });
    // flipH puts the mark at (0, LAST); rotating that clockwise sends it to
    // (LAST, LAST). Rotating FIRST would have landed it at (LAST, 0), so this
    // pins the order rather than merely checking "something moved".
    expect(at(composed, LAST, LAST)).toBe(MARK);
    expect(at(composed, LAST, 0)).toBeNull();
  });

  it("normalizes negative and oversized rotation counts", () => {
    const cells = corner();
    const three = applyOrientation(cells, {
      flipH: false,
      flipV: false,
      rotations: 3,
    });
    const minusOne = applyOrientation(cells, {
      flipH: false,
      flipV: false,
      rotations: -1,
    });
    const seven = applyOrientation(cells, {
      flipH: false,
      flipV: false,
      rotations: 7,
    });
    expect(minusOne).toEqual(three);
    expect(seven).toEqual(three);
  });

  it("combines both flips into a 180° turn", () => {
    const cells = corner();
    const both = applyOrientation(cells, {
      flipH: true,
      flipV: true,
      rotations: 0,
    });
    expect(at(both, LAST, LAST)).toBe(MARK);
  });
});

describe("rotationDegrees", () => {
  it("normalizes to 0/90/180/270", () => {
    expect(rotationDegrees({ flipH: false, flipV: false, rotations: 0 })).toBe(0);
    expect(rotationDegrees({ flipH: false, flipV: false, rotations: 5 })).toBe(90);
    expect(rotationDegrees({ flipH: false, flipV: false, rotations: -1 })).toBe(
      270,
    );
  });
});
