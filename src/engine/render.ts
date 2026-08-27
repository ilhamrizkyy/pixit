/**
 * How a filled cell is DRAWN — shared by the SVG writer and the React preview.
 *
 * Both of them turn the same cells into the same picture, one as a string and
 * one as elements, and they have to agree exactly or a copied icon stops
 * matching the icon that was on screen. So the geometry lives here, in numbers,
 * and neither of them computes a coordinate of its own.
 *
 * This is presentation-independent by construction: no DOM, no JSX, no string
 * building — just arithmetic over the engine's grid units (TECH-STACK.md).
 *
 * A CELL STYLE IS A DISPLAY SETTING, exactly like the gallery's colour, flip,
 * rotation and padding. Stored `cells` are never touched; only the shapes drawn
 * from them change. Exports follow the display (CLAUDE.md), so a copied icon
 * carries whichever style was on screen.
 */

import { CELL_UNITS, GRID_SIZE } from "./constants";
import { toIndex } from "./grid";
import type { Cells } from "./types";

export const CELL_STYLES = ["solid", "gap", "dots"] as const;
export type CellStyle = (typeof CELL_STYLES)[number];

export const DEFAULT_CELL_STYLE: CellStyle = "solid";

export function isCellStyle(value: unknown): value is CellStyle {
  return CELL_STYLES.includes(value as CellStyle);
}

/**
 * How far each node pulls back from its cell's edge, in grid units.
 *
 * 0.5 of a 4-unit cell, so a node is 3 units across and two neighbours sit a
 * full unit apart — four times the lattice's own 0.25 stroke, which is what
 * makes the grid read as the gap rather than as a line hiding inside it.
 *
 * It is deliberately one number for both inset styles. A node that changed size
 * when it changed shape would make Gap and Dots read as two different zoom
 * levels of the icon instead of two treatments of one drawing.
 */
export const CELL_INSET = 0.5;

/** Node width/height for the inset styles. */
export const NODE_UNITS = CELL_UNITS - CELL_INSET * 2;

export type NodeShape =
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "circle"; cx: number; cy: number; r: number };

/**
 * The shape for one filled cell.
 *
 * `run` is how many same-coloured cells this shape covers horizontally, and it
 * is ONLY honoured for `solid`. The inset styles exist to put space between
 * neighbours, so merging neighbours into one shape would erase the very gap
 * being asked for — callers must pass run 1 there, and this ignores anything
 * else rather than trusting them.
 */
export function cellNode(
  row: number,
  col: number,
  style: CellStyle = DEFAULT_CELL_STYLE,
  run = 1,
): NodeShape {
  const x = col * CELL_UNITS;
  const y = row * CELL_UNITS;

  if (style === "solid") {
    return { kind: "rect", x, y, width: run * CELL_UNITS, height: CELL_UNITS };
  }

  if (style === "dots") {
    const radius = NODE_UNITS / 2;
    return {
      kind: "circle",
      cx: x + CELL_UNITS / 2,
      cy: y + CELL_UNITS / 2,
      r: radius,
    };
  }

  return {
    kind: "rect",
    x: x + CELL_INSET,
    y: y + CELL_INSET,
    width: NODE_UNITS,
    height: NODE_UNITS,
  };
}

/**
 * Whether same-coloured neighbours may be drawn as one shape.
 *
 * Solid merges runs, which removes the hairline seams anti-aliasing leaves
 * between abutting rects. The inset styles must not: their neighbours are
 * meant to be separate.
 */
export function mergesRuns(style: CellStyle): boolean {
  return style === "solid";
}

/** One drawn node: where it is, what colour, and a stable React key. */
export type PlacedNode = {
  key: string;
  color: string;
  shape: NodeShape;
};

/**
 * Walk a grid and produce every node to draw, in document order.
 *
 * THE SINGLE WALK. The SVG writer and the React preview both consume this, so
 * they cannot disagree about run merging, insets, or coordinates — which they
 * previously did: the writer merged horizontal runs to kill anti-aliasing seams
 * and the preview emitted one rect per cell, so the copied icon and the icon on
 * screen were subtly different pictures. "Exports follow the display" (CLAUDE.md)
 * is only true if one function decides what the display IS.
 */
export function layoutCells(
  cells: Cells,
  style: CellStyle = DEFAULT_CELL_STYLE,
): PlacedNode[] {
  const nodes: PlacedNode[] = [];
  const merge = mergesRuns(style);

  for (let row = 0; row < GRID_SIZE; row++) {
    let col = 0;
    while (col < GRID_SIZE) {
      const color = cells[toIndex(row, col)];
      if (color === null || color === undefined) {
        col++;
        continue;
      }

      let run = 1;
      if (merge) {
        while (col + run < GRID_SIZE && cells[toIndex(row, col + run)] === color) {
          run++;
        }
      }

      nodes.push({
        key: `${row}-${col}`,
        color,
        shape: cellNode(row, col, style, run),
      });
      col += run;
    }
  }

  return nodes;
}
