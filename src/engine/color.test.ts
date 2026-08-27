import { describe, expect, it } from "vitest";
import { galleryColorFromInput, recolorCells } from "./color";
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
