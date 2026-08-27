import { describe, expect, it } from "vitest";
import { CELL_COUNT, GRID_SIZE } from "@/engine/constants";
import { createEmptyCells, toIndex } from "@/engine/grid";
import type { Cells } from "@/engine/types";
import { cellsFromArt, cellsToArt, toRegistryEntry } from "./authoring";

/**
 * These cover the bridge from the composer to the published set: a drawing
 * leaves the browser as the same art-map source the registry is written in.
 *
 * The property that matters is the ROUND TRIP. `cellsToArt` claims to be the
 * inverse of `cellsFromArt`, and the registry loader is the thing that will
 * actually read what this emits — so the test runs the output back through the
 * real loader rather than through a second copy of the same assumptions.
 */

const draw = (fill: Record<number, string>): Cells => {
  const cells = createEmptyCells();
  for (const [index, color] of Object.entries(fill)) cells[Number(index)] = color;
  return cells;
};

const roundTrip = (cells: Cells): Cells => {
  const { art, palette } = cellsToArt(cells);
  return cellsFromArt(art, palette);
};

describe("cells to art and back", () => {
  it("survives a single-colour drawing", () => {
    const cells = draw({ 0: "#111111", 60: "#111111", 120: "#111111" });
    expect(roundTrip(cells)).toEqual(cells);
  });

  it("survives an empty drawing", () => {
    expect(roundTrip(createEmptyCells())).toEqual(createEmptyCells());
  });

  it("survives a full drawing", () => {
    const cells = createEmptyCells().map(() => "#ff0000") as Cells;
    expect(roundTrip(cells)).toEqual(cells);
  });

  it("survives several colours, giving each its own character", () => {
    const cells = draw({ 0: "#ff0000", 1: "#00ff00", 2: "#0000ff", 3: "#ff0000" });
    expect(roundTrip(cells)).toEqual(cells);

    const { art } = cellsToArt(cells);
    // Three colours, three characters — and the repeat reuses the first.
    expect(art[0].slice(0, 4)).toBe("#o+#");
  });

  it("writes a single-colour icon with the same # every seed uses", () => {
    const { art, palette } = cellsToArt(draw({ 5: "#111111" }));
    expect(palette).toEqual({ "#": "#111111" });
    expect(art[0]).toBe(".....#.....");
  });

  it("refuses a drawing with more colours than an art map can name", () => {
    const fill: Record<number, string> = {};
    for (let i = 0; i < 11; i++) fill[i] = `#0000${i.toString(16).padStart(2, "0")}`;
    expect(() => cellsToArt(draw(fill))).toThrow(/colours/);
  });

  it("keeps rows square, so the loader's own shape check passes", () => {
    const { art } = cellsToArt(draw({ 0: "#111111" }));
    expect(art).toHaveLength(GRID_SIZE);
    for (const row of art) expect(row).toHaveLength(GRID_SIZE);
  });
});

describe("the registry entry", () => {
  const cells = draw({
    [toIndex(5, 5)]: "#111111",
    [toIndex(5, 6)]: "#111111",
  });
  const entry = toRegistryEntry({
    id: "test-icon",
    name: "test-icon",
    category: "interface",
    tags: ["one", "two"],
    createdAt: "2026-08-20T00:00:00.000Z",
    cells,
  });

  it("is a defineIcon call carrying every field the registry needs", () => {
    expect(entry).toContain("defineIcon({");
    expect(entry).toContain('id: "test-icon"');
    expect(entry).toContain('category: "interface"');
    expect(entry).toContain('tags: ["one", "two"]');
    expect(entry).toContain('createdAt: "2026-08-20T00:00:00.000Z"');
    expect(entry).toContain('palette: { "#": "#111111" }');
  });

  it("carries art the real loader reproduces the drawing from", () => {
    // Parsed back OUT of the emitted text, not out of the object that built it
    // — the string is what gets pasted, so the string is what has to be right.
    const art = [...entry.matchAll(/^ {6}"(.{11})",$/gm)].map((match) => match[1]);
    expect(art).toHaveLength(GRID_SIZE);
    expect(cellsFromArt(art, { "#": "#111111" })).toEqual(cells);
  });

  it("indents to drop straight into the icons array", () => {
    const lines = entry.split("\n");
    expect(lines[0]).toBe("  defineIcon({");
    expect(lines.at(-2)).toBe("  }),");
    // Trailing newline, so pasting several in a row does not weld them together.
    expect(lines.at(-1)).toBe("");
  });

  it("emits every cell of the grid", () => {
    const full = createEmptyCells().map(() => "#111111") as Cells;
    const { art } = cellsToArt(full);
    expect(art.join("").length).toBe(CELL_COUNT);
    expect(art.join("")).not.toContain(".");
  });
});
