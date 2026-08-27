import { describe, expect, it } from "vitest";
import { CELL_UNITS, GRID_SIZE } from "./constants";
import {
  CELL_INSET,
  CELL_STYLES,
  NODE_UNITS,
  cellNode,
  isCellStyle,
  mergesRuns,
} from "./render";

/**
 * The geometry the writer and the preview SHARE.
 *
 * Its whole reason to exist is that a copied icon must match the icon that was
 * on screen, so what matters here is not any single coordinate but that one
 * function is the only source of them.
 */

describe("cellNode — solid", () => {
  it("fills its cell exactly, leaving no gap to reveal the grid", () => {
    expect(cellNode(0, 0, "solid")).toEqual({
      kind: "rect", x: 0, y: 0, width: CELL_UNITS, height: CELL_UNITS,
    });
  });

  it("spans a run, which is what removes anti-aliasing seams", () => {
    expect(cellNode(2, 1, "solid", 3)).toEqual({
      kind: "rect", x: CELL_UNITS, y: 2 * CELL_UNITS, width: 3 * CELL_UNITS, height: CELL_UNITS,
    });
  });

  it("reaches the far corner of the canvas", () => {
    const last = GRID_SIZE - 1;
    const node = cellNode(last, last, "solid");
    expect(node).toMatchObject({ x: last * CELL_UNITS, y: last * CELL_UNITS });
  });
});

describe("cellNode — gap", () => {
  it("insets on every side, so neighbours never touch", () => {
    expect(cellNode(0, 0, "gap")).toEqual({
      kind: "rect", x: CELL_INSET, y: CELL_INSET, width: NODE_UNITS, height: NODE_UNITS,
    });
  });

  it("leaves twice the inset between two adjacent nodes", () => {
    const left = cellNode(0, 0, "gap");
    const right = cellNode(0, 1, "gap");
    if (left.kind !== "rect" || right.kind !== "rect") throw new Error("expected rects");

    const between = right.x - (left.x + left.width);
    expect(between).toBe(CELL_INSET * 2);
    // Wider than the lattice's own 0.25 stroke, or the "gap" would just be the
    // grid line and the mode would look like a rendering artefact.
    expect(between).toBeGreaterThan(0.25);
  });

  it("IGNORES a run, because merging neighbours would erase the gap", () => {
    // The one way this mode can be silently broken: a caller passes the run it
    // computed for solid and the nodes weld back into a bar.
    expect(cellNode(0, 0, "gap", 5)).toEqual(cellNode(0, 0, "gap"));
  });

  it("stays inside its own cell", () => {
    const node = cellNode(3, 4, "gap");
    if (node.kind !== "rect") throw new Error("expected a rect");
    expect(node.x).toBeGreaterThanOrEqual(4 * CELL_UNITS);
    expect(node.x + node.width).toBeLessThanOrEqual(5 * CELL_UNITS);
  });
});

describe("cellNode — dots", () => {
  it("is a circle centred in its cell", () => {
    expect(cellNode(0, 0, "dots")).toEqual({
      kind: "circle", cx: CELL_UNITS / 2, cy: CELL_UNITS / 2, r: NODE_UNITS / 2,
    });
  });

  it("is the same size as a gap node, so the two read as one drawing", () => {
    const dot = cellNode(1, 1, "dots");
    const square = cellNode(1, 1, "gap");
    if (dot.kind !== "circle" || square.kind !== "rect") throw new Error("shape");
    expect(dot.r * 2).toBe(square.width);
  });

  it("centres on the cell whatever the row and column", () => {
    const node = cellNode(5, 7, "dots");
    expect(node).toMatchObject({
      cx: 7 * CELL_UNITS + CELL_UNITS / 2,
      cy: 5 * CELL_UNITS + CELL_UNITS / 2,
    });
  });

  it("IGNORES a run", () => {
    expect(cellNode(0, 0, "dots", 4)).toEqual(cellNode(0, 0, "dots"));
  });
});

describe("style plumbing", () => {
  it("defaults to solid, so nothing changes for anyone who sets nothing", () => {
    expect(cellNode(2, 3)).toEqual(cellNode(2, 3, "solid"));
  });

  it("merges runs for solid alone", () => {
    expect(mergesRuns("solid")).toBe(true);
    expect(mergesRuns("gap")).toBe(false);
    expect(mergesRuns("dots")).toBe(false);
  });

  it.each(CELL_STYLES)("recognises %s", (style) => {
    expect(isCellStyle(style)).toBe(true);
  });

  it.each(["", "square", "circle", "SOLID", null, undefined, 3])(
    "rejects %j, so a stale URL or draft cannot smuggle a style in",
    (value) => {
      expect(isCellStyle(value)).toBe(false);
    },
  );

  it("emits coordinates that serialize without floating-point noise", () => {
    // 0.30000000000000004 in a copied SVG is the tell of geometry computed
    // rather than chosen. Every value here has to be exact in binary.
    for (const style of CELL_STYLES) {
      const node = cellNode(6, 9, style);
      for (const value of Object.values(node)) {
        if (typeof value !== "number") continue;
        expect(String(value)).not.toMatch(/\d{6,}/);
      }
    }
  });
});
