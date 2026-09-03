import { describe, expect, it } from "vitest";
import {
  ICON_SIZES,
  MAX_RENDERED_SIZE,
  SIZE_STOPS,
  renderedIconSize,
} from "@/engine/constants";
import { pngCellEdges } from "@/lib/download";
import { GRID_SIZE } from "@/engine/constants";

/**
 * THE SIZE SCALE RUNS PAST WHAT THE GRID CAN DRAW, and the two halves of it do
 * different jobs (INTERACTION.md §6). These pin the arithmetic that makes that
 * safe rather than merely intended.
 */
describe("the size scale", () => {
  it("runs 16 to 120 in 8s, and starts where the drawn sizes do", () => {
    expect(SIZE_STOPS[0]).toBe(16);
    expect(SIZE_STOPS[SIZE_STOPS.length - 1]).toBe(120);
    for (let i = 1; i < SIZE_STOPS.length; i++) {
      expect(SIZE_STOPS[i] - SIZE_STOPS[i - 1]).toBe(8);
    }
    // The drawn sizes are the bottom of the same scale, not a second list that
    // has to be kept in step by hand.
    for (const size of ICON_SIZES) expect(SIZE_STOPS).toContain(size);
  });

  it("caps what the grid draws, and leaves everything below the cap alone", () => {
    for (const stop of SIZE_STOPS) {
      expect(renderedIconSize(stop)).toBe(Math.min(stop, MAX_RENDERED_SIZE));
    }
    expect(renderedIconSize(24)).toBe(24);
    expect(renderedIconSize(120)).toBe(MAX_RENDERED_SIZE);
    // The cap IS the top of the drawn scale — the seat is 64px and 8px of
    // padding leaves exactly this. Two numbers that must agree.
    expect(MAX_RENDERED_SIZE).toBe(ICON_SIZES[ICON_SIZES.length - 1]);
  });
});

/**
 * NEAREST-NEIGHBOUR, NOT ANTI-ALIASING. 11 divides almost none of the scale, so
 * without snapping every cell edge in a 24px PNG lands on a fraction and the
 * canvas softens it — which is the one thing a pixel icon cannot survive.
 */
describe("the PNG rasterizer's geometry", () => {
  it.each(SIZE_STOPS)("fills exactly %ipx with whole-pixel cells", (pixels) => {
    const edges = pngCellEdges(pixels);

    expect(edges).toHaveLength(GRID_SIZE + 1);
    expect(edges[0]).toBe(0);
    // No gap and no overrun: the cells tile the canvas exactly.
    expect(edges[GRID_SIZE]).toBe(pixels);
    for (const edge of edges) expect(Number.isInteger(edge)).toBe(true);

    const widths = edges.slice(1).map((edge, i) => edge - edges[i]);
    // Every cell is drawn, and no two differ by more than a pixel — which is
    // what stops the rounding showing up as one fat row.
    expect(Math.min(...widths)).toBeGreaterThan(0);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  });
});
