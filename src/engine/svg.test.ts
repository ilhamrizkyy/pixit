import { describe, expect, it } from "vitest";
import { icons } from "@/registry";
import {
  CANVAS_UNITS,
  CELL_COUNT,
  CELL_UNITS,
  GRID_SIZE,
  PADDING_STEPS,
  VIEW_BOX,
  viewBoxWithPadding,
} from "./constants";
import { createEmptyCells, fillCell, isValidCells, toIndex } from "./grid";
import { cellsToSvg, iconToSvg, svgFileName, svgToCells } from "./svg";
import type { Cells, IconDef } from "./types";

const RED = "#ff0000";
const BLUE = "#0000ff";

function withRow(row: number, color: string): Cells {
  let cells = createEmptyCells();
  for (let col = 0; col < GRID_SIZE; col++) {
    cells = fillCell(cells, toIndex(row, col), color);
  }
  return cells;
}

function countRects(svg: string): number {
  return svg.match(/<rect /g)?.length ?? 0;
}

describe("cellsToSvg", () => {
  it("emits the canonical viewBox and no background", () => {
    const svg = cellsToSvg(createEmptyCells());
    expect(svg).toContain(`viewBox="${VIEW_BOX}"`);
    expect(svg).toContain('fill="none"');
    expect(countRects(svg)).toBe(0);
  });

  it("bakes literal hex and never emits currentColor", () => {
    const svg = cellsToSvg(fillCell(createEmptyCells(), 0, RED));
    expect(svg).toContain(`fill="${RED}"`);
    expect(svg).not.toContain("currentColor");
  });

  it("places a cell at its grid position in user units", () => {
    const svg = cellsToSvg(fillCell(createEmptyCells(), toIndex(2, 3), RED));
    expect(svg).toContain(
      `<rect x="${3 * CELL_UNITS}" y="${2 * CELL_UNITS}" width="${CELL_UNITS}" height="${CELL_UNITS}"/>`,
    );
  });

  it("names the dominant colour once, on the root", () => {
    const svg = cellsToSvg(fillCell(createEmptyCells(), toIndex(2, 3), RED));

    expect(svg).toContain(`fill="${RED}"`);
    // Once. A single-colour icon repeating its hex on every rect is about a
    // third of the file and most of what makes pasted markup unreadable.
    expect(svg.split(`fill="${RED}"`)).toHaveLength(2);
  });

  it("leaves a minority colour on its own rect", () => {
    let cells = createEmptyCells();
    for (const index of [0, 1, 2]) cells = fillCell(cells, index, RED);
    cells = fillCell(cells, 11, "#00ff00");

    const svg = cellsToSvg(cells);

    expect(svg).toContain(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" fill="${RED}"`);
    expect(svg).toContain(`fill="#00ff00"/>`);
  });

  it("keeps fill=\"none\" when there is nothing to inherit", () => {
    expect(cellsToSvg(createEmptyCells())).toContain('fill="none"');
  });

  it("merges a run of same-colored cells into one rect", () => {
    // Merging is what removes anti-aliasing seams between adjacent cells, so
    // this is a rendering-quality guarantee, not just a size optimization.
    const svg = cellsToSvg(withRow(0, RED));
    expect(countRects(svg)).toBe(1);
    expect(svg).toContain(`width="${GRID_SIZE * CELL_UNITS}"`);
  });

  it("breaks a run where the color changes", () => {
    let cells = withRow(0, RED);
    cells = fillCell(cells, toIndex(0, 5), BLUE);
    // red | blue | red
    expect(countRects(cellsToSvg(cells))).toBe(3);
  });

  it("does not merge across rows", () => {
    const cells = withRow(0, RED);
    const twoRows = withRow(1, RED).map((cell, index) =>
      cell !== null ? cell : cells[index],
    );
    expect(countRects(cellsToSvg(twoRows))).toBe(2);
  });

  it("adds width/height only when a size is given", () => {
    expect(cellsToSvg(createEmptyCells())).not.toContain("width=\"24\"");
    expect(cellsToSvg(createEmptyCells(), { size: 24 })).toContain(
      'width="24" height="24"',
    );
  });

  it("escapes markup in the title", () => {
    const svg = cellsToSvg(createEmptyCells(), { title: "a<b>&c" });
    expect(svg).toContain("<title>a&lt;b&gt;&amp;c</title>");
  });

  it("grows the viewBox for padding rather than scaling the art", () => {
    const cells = fillCell(createEmptyCells(), toIndex(0, 0), RED);
    const padded = cellsToSvg(cells, { padding: 2 });
    expect(padded).toContain(`viewBox="${viewBoxWithPadding(2)}"`);
    // The cell itself stays exactly where it was — that is what keeps pixel
    // edges on-grid at any padding.
    expect(padded).toContain('x="0" y="0"');
  });
});

describe("viewBoxWithPadding", () => {
  it("returns the base viewBox at zero", () => {
    expect(viewBoxWithPadding(0)).toBe(VIEW_BOX);
    expect(viewBoxWithPadding(-1)).toBe(VIEW_BOX);
  });

  it("expands symmetrically by whole cells", () => {
    const pad = CELL_UNITS;
    expect(viewBoxWithPadding(1)).toBe(
      `${-pad} ${-pad} ${CANVAS_UNITS + pad * 2} ${CANVAS_UNITS + pad * 2}`,
    );
    expect(viewBoxWithPadding(3)).toBe("-12 -12 68 68");
  });
});

describe("svgFileName", () => {
  it("uses the stable id, not the display name", () => {
    expect(svgFileName({ id: "arrow-right" } as IconDef)).toBe(
      "arrow-right.svg",
    );
  });
});

/* ============================================================================
   Import.
   ========================================================================= */

/** A row segment, so a merged multi-cell rect can be tested in isolation. */
function withRun(row: number, from: number, length: number, color: string): Cells {
  let cells = createEmptyCells();
  for (let col = from; col < from + length; col++) {
    cells = fillCell(cells, toIndex(row, col), color);
  }
  return cells;
}

/** Wrap a body in our root element, so a test can vary only what it is about. */
function svgWith(body: string, viewBox: string = VIEW_BOX): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" role="img">${body}</svg>`;
}

type RectAttributes = Partial<
  Record<"x" | "y" | "width" | "height" | "fill", string>
>;

/** One valid cell-sized rect, with any attribute overridden for the bad cases. */
function rect(overrides: RectAttributes = {}): string {
  const a = {
    x: "0",
    y: "0",
    width: String(CELL_UNITS),
    height: String(CELL_UNITS),
    fill: RED,
    ...overrides,
  };
  return `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" fill="${a.fill}"/>`;
}

describe("svgToCells round-trip", () => {
  it("restores every icon in the registry exactly", () => {
    // The load-bearing test: the registry is the real corpus, so a parser that
    // mishandles any run, gap, or row boundary fails here rather than in the
    // composer after an owner has already lost work.
    for (const icon of icons) {
      expect(svgToCells(cellsToSvg(icon.cells)), icon.id).toEqual(icon.cells);
    }
  });

  it("survives the title and size options", () => {
    for (const icon of icons) {
      const svg = iconToSvg(icon, { size: 24 });
      expect(svgToCells(svg), icon.id).toEqual(icon.cells);
    }
  });

  it("reads an escaped title without treating it as markup", () => {
    const cells = withRun(3, 2, 4, BLUE);
    const svg = cellsToSvg(cells, { title: "a<b>&c" });
    expect(svgToCells(svg)).toEqual(cells);
  });

  it("drops padding at every step, since padding is display-only", () => {
    // A padded export has a negative-origin viewBox while its rects stay in
    // the unpadded space, so every padding must yield the identical drawing.
    // The corner cell is the one that catches a parser that "helpfully"
    // subtracts the viewBox origin: it would slide the art off the grid.
    const corner = fillCell(createEmptyCells(), toIndex(0, 0), BLUE);
    for (const padding of PADDING_STEPS) {
      const label = `pad ${padding}`;
      expect(svgToCells(cellsToSvg(icons[0].cells, { padding })), label).toEqual(
        icons[0].cells,
      );
      expect(svgToCells(cellsToSvg(corner, { padding })), label).toEqual(corner);
    }
  });

  it("expands a merged horizontal run back into separate cells", () => {
    // buildRects merges a run into ONE wide rect. A reader assuming one rect
    // per cell passes every other test here and silently loses four pixels.
    const cells = withRun(4, 3, 5, RED);
    const svg = cellsToSvg(cells);
    expect(countRects(svg)).toBe(1);

    const parsed = svgToCells(svg);
    expect(parsed).toEqual(cells);
    for (let col = 3; col < 8; col++) {
      expect(parsed[toIndex(4, col)]).toBe(RED);
    }
    expect(parsed[toIndex(4, 8)]).toBeNull();
  });

  it("restores a full-width row and a mixed row", () => {
    const full = withRow(0, RED);
    expect(svgToCells(cellsToSvg(full))).toEqual(full);

    const mixed = fillCell(withRow(5, RED), toIndex(5, 5), BLUE);
    expect(svgToCells(cellsToSvg(mixed))).toEqual(mixed);
  });

  it("returns 121 nulls for an empty grid", () => {
    const parsed = svgToCells(cellsToSvg(createEmptyCells()));
    expect(parsed).toHaveLength(CELL_COUNT);
    expect(parsed.every((cell) => cell === null)).toBe(true);
  });

  it("returns a grid that passes the structural check", () => {
    expect(isValidCells(svgToCells(iconToSvg(icons[0])))).toBe(true);
  });
});

describe("svgToCells tolerance", () => {
  it("accepts any attribute order and the </rect> closing form", () => {
    const svg = svgWith(
      `<rect fill="${RED}" height="${CELL_UNITS}" width="${CELL_UNITS}" y="${CELL_UNITS}" x="${2 * CELL_UNITS}"></rect>`,
    );
    expect(svgToCells(svg)[toIndex(1, 2)]).toBe(RED);
  });

  it("accepts whitespace between elements", () => {
    const svg = svgWith(`\n  <title>spaced</title>\n  ${rect()}\n`);
    expect(svgToCells(svg)[0]).toBe(RED);
  });

  it("normalizes shorthand and uppercase hex to the stored form", () => {
    // A hand-edited export still imports, and every cell comes back in the one
    // form a cell may hold: lowercase, 6 digits, leading #.
    expect(svgToCells(svgWith(rect({ fill: "#F00" })))[0]).toBe(RED);
    expect(svgToCells(svgWith(rect({ fill: "#FF0000" })))[0]).toBe(RED);
  });

  it("tolerates a leading XML prolog", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>${svgWith(rect())}`;
    expect(svgToCells(svg)[0]).toBe(RED);
  });
});

describe("svgToCells rejection", () => {
  it("rejects input that is not markup at all", () => {
    expect(() => svgToCells("")).toThrow(/no <svg> element/);
    expect(() => svgToCells("arrow-right")).toThrow(/no <svg> element/);
  });

  it("rejects an unclosed root", () => {
    expect(() => svgToCells(`<svg viewBox="${VIEW_BOX}">${rect()}`)).toThrow(
      /never closed/,
    );
  });

  it("rejects a valid SVG from another icon set", () => {
    // A Lucide icon is a perfectly good SVG and must still be refused — the
    // viewBox is what identifies a Pixle canvas.
    const lucide =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/></svg>';
    expect(() => svgToCells(lucide)).toThrow(/not a Pixle canvas/);
  });

  it("rejects a missing or misshapen viewBox", () => {
    expect(() =>
      svgToCells('<svg xmlns="http://www.w3.org/2000/svg">' + rect() + "</svg>"),
    ).toThrow(/no viewBox/);
    expect(() => svgToCells(svgWith(rect(), "0 0 44 48"))).toThrow(
      /not a Pixle canvas/,
    );
    // Padded origin without the grown extent: the art would land off-canvas.
    expect(() => svgToCells(svgWith(rect(), "-4 -4 44 44"))).toThrow(
      /not a Pixle canvas/,
    );
    expect(() => svgToCells(svgWith(rect(), "0 0 44"))).toThrow(
      /four whole numbers/,
    );
  });

  it("rejects any element we never write", () => {
    expect(() => svgToCells(svgWith('<path d="M0 0h44"/>'))).toThrow(
      /unsupported element <path>/,
    );
    expect(() => svgToCells(svgWith('<g><rect x="0"/></g>'))).toThrow(
      /unsupported element <g>/,
    );
  });

  it("rejects stray text between elements", () => {
    expect(() => svgToCells(svgWith(`${rect()}oops`))).toThrow(
      /unexpected content/,
    );
  });

  it("rejects a non-integer coordinate", () => {
    expect(() => svgToCells(svgWith(rect({ x: "2.5" })))).toThrow(
      /not a whole number/,
    );
  });

  it("rejects a coordinate off the cell grid", () => {
    expect(() => svgToCells(svgWith(rect({ y: "2" })))).toThrow(/off the/);
  });

  it("rejects a rect outside the grid", () => {
    const past = String(GRID_SIZE * CELL_UNITS);
    expect(() => svgToCells(svgWith(rect({ x: past })))).toThrow(/outside the/);
    expect(() => svgToCells(svgWith(rect({ x: "-4" })))).toThrow(/outside the/);
    // A run that starts on the grid but overflows the row end.
    const lastCol = String((GRID_SIZE - 1) * CELL_UNITS);
    expect(() =>
      svgToCells(
        svgWith(rect({ x: lastCol, width: String(CELL_UNITS * 2) })),
      ),
    ).toThrow(/outside the/);
  });

  it("rejects a rect that is not one cell tall or a cell multiple wide", () => {
    expect(() =>
      svgToCells(svgWith(rect({ height: String(CELL_UNITS * 2) }))),
    ).toThrow(/one cell tall/);
    expect(() => svgToCells(svgWith(rect({ width: "6" })))).toThrow(
      /whole number of cells/,
    );
    expect(() => svgToCells(svgWith(rect({ width: "0" })))).toThrow(
      /whole number of cells/,
    );
  });

  it("rejects a fill that is not a baked hex", () => {
    expect(() => svgToCells(svgWith(rect({ fill: "none" })))).toThrow(
      /not a hex color/,
    );
    expect(() => svgToCells(svgWith(rect({ fill: "currentColor" })))).toThrow(
      /not a hex color/,
    );
  });

  it("rejects a rect with a missing attribute", () => {
    expect(() =>
      svgToCells(svgWith(`<rect y="0" width="4" height="4" fill="${RED}"/>`)),
    ).toThrow(/missing x/);
    // The root here is fill="none", so an unfilled rect has nothing to inherit.
    expect(() =>
      svgToCells(svgWith(`<rect x="0" y="0" width="4" height="4"/>`)),
    ).toThrow(/no fill and the <svg> has none to inherit/);
  });

  it("still reads an export written before the fill was hoisted", () => {
    // Every rect naming its own colour under a fill="none" root is what this
    // tool wrote until 2026-08-20, and those files exist on disk. Hoisting the
    // dominant colour changed the WRITER; the reader has to keep accepting
    // both, or the format quietly stopped round-tripping its own history.
    const legacy = svgWith(
      `<rect x="0" y="0" width="8" height="4" fill="${RED}"/>` +
        `<rect x="0" y="4" width="4" height="4" fill="${RED}"/>`,
    );

    const cells = svgToCells(legacy);

    expect(cells[toIndex(0, 0)]).toBe(RED);
    expect(cells[toIndex(0, 1)]).toBe(RED);
    expect(cells[toIndex(1, 0)]).toBe(RED);
    expect(cells[toIndex(1, 1)]).toBeNull();
  });

  it("round-trips a drawing through the hoisted form", () => {
    let cells = createEmptyCells();
    for (const index of [0, 1, 2, 13, 24]) cells = fillCell(cells, index, RED);
    cells = fillCell(cells, 40, "#0000ff");

    expect(svgToCells(cellsToSvg(cells))).toEqual(cells);
  });

  it("rejects overlapping rects rather than letting one win", () => {
    // Our writer emits disjoint runs, so an overlap means the file came from
    // somewhere else and the drawing cannot be trusted.
    expect(() => svgToCells(svgWith(rect() + rect({ fill: BLUE })))).toThrow(
      /overlap at row 0, col 0/,
    );
  });
});

describe("cell styles", () => {
  /** A three-cell horizontal run, one colour — the case that merges. */
  const run = (): Cells => {
    const cells = createEmptyCells();
    cells[toIndex(5, 4)] = "#111111";
    cells[toIndex(5, 5)] = "#111111";
    cells[toIndex(5, 6)] = "#111111";
    return cells;
  };

  it("solid merges the run into ONE rect", () => {
    const svg = cellsToSvg(run(), { cellStyle: "solid" });
    expect(svg.match(/<rect/g)).toHaveLength(1);
    expect(svg).toContain('width="12"');
  });

  it("solid is what you get by asking for nothing", () => {
    expect(cellsToSvg(run())).toBe(cellsToSvg(run(), { cellStyle: "solid" }));
  });

  it("gap draws each cell separately, or there would be no gap", () => {
    const svg = cellsToSvg(run(), { cellStyle: "gap" });
    // Three nodes, not one 12-unit bar: merging is exactly the bug this mode
    // is vulnerable to, and it would look like solid with rounded ends.
    expect(svg.match(/<rect/g)).toHaveLength(3);
    expect(svg).toContain('x="16.5" y="20.5" width="3" height="3"');
    expect(svg).not.toContain('width="12"');
  });

  it("dots draws circles centred in their cells", () => {
    const svg = cellsToSvg(run(), { cellStyle: "dots" });
    expect(svg.match(/<circle/g)).toHaveLength(3);
    expect(svg).toContain('cx="18" cy="22" r="1.5"');
    expect(svg).not.toContain("<rect");
  });

  it("still hoists the dominant colour to the root in every style", () => {
    for (const style of ["solid", "gap", "dots"] as const) {
      const svg = cellsToSvg(run(), { cellStyle: style });
      expect(svg).toContain('fill="#111111"');
      // Named once on the root, never repeated on the nodes.
      expect(svg.match(/#111111/g)).toHaveLength(1);
    }
  });

  it("names a second colour on the node that wears it", () => {
    const cells = run();
    cells[toIndex(5, 6)] = "#dc2626";
    const svg = cellsToSvg(cells, { cellStyle: "dots" });
    expect(svg).toContain('fill="#dc2626"');
  });

  it("keeps every style inside the viewBox", () => {
    const cells = createEmptyCells();
    cells[toIndex(0, 0)] = "#111111";
    cells[toIndex(10, 10)] = "#111111";
    for (const style of ["solid", "gap", "dots"] as const) {
      const svg = cellsToSvg(cells, { cellStyle: style });
      for (const value of svg.matchAll(/(?:x|y|cx|cy)="(-?[\d.]+)"/g)) {
        expect(Number(value[1])).toBeGreaterThanOrEqual(0);
        expect(Number(value[1])).toBeLessThanOrEqual(44);
      }
    }
  });

  it("writes no floating-point noise into the markup", () => {
    for (const style of ["solid", "gap", "dots"] as const) {
      expect(cellsToSvg(run(), { cellStyle: style })).not.toMatch(/\d\.\d{6,}/);
    }
  });

  /* The round-trip boundary. `svgToCells` reads what the writer produces in
     SOLID, which is the format BACKLOG.md D guarantees. A styled export is a
     picture of an icon rather than a description of one — the inset is not
     recoverable as cells — so the reader must REFUSE it outright rather than
     import something quietly wrong. */
  it("refuses to read a gap export, naming the reason", () => {
    // It stops at the fractional coordinate, before it ever reaches the
    // width — the inset is what puts a node off the whole-unit grid.
    expect(() => svgToCells(cellsToSvg(run(), { cellStyle: "gap" }))).toThrow(
      /x="16\.5" is not a whole number of user units/,
    );
  });

  it("refuses to read a dots export, naming the reason", () => {
    expect(() => svgToCells(cellsToSvg(run(), { cellStyle: "dots" }))).toThrow(
      /circle/,
    );
  });

  it("still round-trips its own solid export", () => {
    // The guarantee that must survive all of this.
    expect(svgToCells(cellsToSvg(run(), { cellStyle: "solid" }))).toEqual(run());
  });
});
