/**
 * SVG serialization. String building only — no DOM, no DOMParser, no canvas.
 * That keeps the engine boundary intact (TECH-STACK.md) and lets this run
 * identically on the server, in the browser, and in a test runner.
 *
 * SVG is a RENDER TARGET generated from cells, never the stored form
 * (CLAUDE.md rule 3).
 *
 * PNG export is deliberately absent: rasterizing needs a canvas, which is a
 * rendering dependency. Presentation rasterizes the string this module
 * produces.
 */

import {
  CANVAS_UNITS,
  CELL_UNITS,
  GRID_SIZE,
  VIEW_BOX,
  viewBoxWithPadding,
} from "./constants";
import type { Cells, IconDef } from "./types";
import { createEmptyCells, inBounds, normalizeHex, toIndex } from "./grid";
import { DEFAULT_CELL_STYLE, layoutCells, type CellStyle } from "./render";

export type ToSvgOptions = {
  /** Rendered width/height attribute in px. Omit for a viewBox-only SVG. */
  size?: number;
  /** `id` for a title element, improving a11y of inlined icons. */
  title?: string;
  /** Empty space around the art, in cells. Grows the viewBox. */
  padding?: number;
  /**
   * How each filled cell is drawn. A DISPLAY setting — `cells` are untouched,
   * and the export simply follows whatever was on screen (CLAUDE.md).
   */
  cellStyle?: CellStyle;
};

function dominantColor(cells: Cells): string | null {
  const counts = new Map<string, number>();
  for (const cell of cells) {
    if (cell === null) continue;
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  // First-encountered wins a tie, so the same drawing always writes the same
  // file — a serializer whose output depends on Map iteration luck makes every
  // diff suspect.
  for (const [color, count] of counts) {
    if (count > bestCount) {
      best = color;
      bestCount = count;
    }
  }
  return best;
}

/**
 * One element per run of same-coloured cells — or per cell, when the style
 * cannot merge them.
 *
 * SOLID MERGES RUNS, and that is not only a size win: adjacent rects sharing an
 * edge show a hairline seam under anti-aliasing, and merging removes most of
 * them outright. The inset styles must not merge, because the space between
 * neighbours is the entire point of them — so `mergesRuns` decides, and the
 * geometry itself comes from `cellNode`, which the React preview also uses.
 * Two code paths computing the same coordinates is how a copied icon stops
 * matching the one that was on screen.
 */
function buildNodes(
  cells: Cells,
  inherited: string | null,
  style: CellStyle,
): string {
  return layoutCells(cells, style)
    .map(({ color, shape }) => {
      // The dominant colour is named ONCE, on the root, and every node wearing
      // it simply inherits. Still fully baked — a literal hex, not
      // currentColor — it just stops a 12-node icon repeating the same seven
      // characters twelve times.
      const fill = color === inherited ? "" : ` fill="${color}"`;
      return shape.kind === "circle"
        ? `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"${fill}/>`
        : `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${fill}/>`;
    })
    .join("");
}

/** Escape text destined for an XML text node. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Serialize cells to an SVG string with baked per-cell colors.
 *
 * Note what is NOT here: no `currentColor` and no CSS custom properties. Every
 * color is a literal hex, so a copied icon looks identical wherever it lands
 * (CLAUDE.md rule 2).
 *
 * The root DOES carry a `fill`, and it is the drawing's dominant color rather
 * than `none`. That is still fully baked — a literal hex that every inheriting
 * rect resolves to — it just stops a single-color icon from spelling the same
 * seven characters out on all twelve of its rects. An empty drawing has no
 * dominant color, so it keeps `fill="none"`.
 */
export function cellsToSvg(cells: Cells, options: ToSvgOptions = {}): string {
  const { size, title, padding = 0, cellStyle = DEFAULT_CELL_STYLE } = options;
  const dimensions =
    size === undefined ? "" : ` width="${size}" height="${size}"`;
  const titleEl =
    title === undefined ? "" : `<title>${escapeXml(title)}</title>`;
  const inherited = dominantColor(cells);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxWithPadding(padding)}"${dimensions}` +
    ` fill="${inherited ?? "none"}" role="img">${titleEl}${buildNodes(cells, inherited, cellStyle)}</svg>`
  );
}

/** Serialize a whole icon, titled with its name. */
export function iconToSvg(icon: IconDef, options: ToSvgOptions = {}): string {
  return cellsToSvg(icon.cells, { title: icon.name, ...options });
}

/** Filename for a downloaded icon. */
export function svgFileName(icon: IconDef): string {
  return `${icon.id}.svg`;
}


/* ============================================================================
   Import.

   The reader half of this file. It is deliberately NOT a general SVG parser:
   v1 guarantees round-tripping only what `cellsToSvg` wrote (BACKLOG.md D), so
   this reads one known shape and refuses everything else. Same constraint as
   the writer — string scanning only, no DOMParser, or the engine boundary
   breaks (TECH-STACK.md).
   ========================================================================= */

/** Attributes read off one tag, keyed by name. */
type Attributes = Record<string, string>;

/** The open `<svg …>` tag. Searched for, so an XML prolog is tolerated. */
const ROOT_TAG = /<svg(\s[^>]*)?>/;

/** `name="value"`, double-quoted — the only form the writer emits. */
const ATTRIBUTE = /([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g;

const TAG_NAME = /^[a-zA-Z][-\w:.]*/;

/** Coordinates are whole user units — a fractional one cannot be on-grid. */
const WHOLE_NUMBER = /^-?\d+$/;

/**
 * Every rejection funnels through here so an import failure names the file's
 * problem rather than surfacing as a drawing that is quietly missing pixels.
 */
function fail(message: string): never {
  throw new Error(`svgToCells: ${message}`);
}

function parseAttributes(source: string): Attributes {
  const attributes: Attributes = {};
  for (const match of source.matchAll(ATTRIBUTE)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

/** Markup between our elements may only be whitespace — never stray text. */
function assertBlank(text: string, where: string): void {
  if (text.trim() !== "") fail(`unexpected content ${where}: "${text.trim()}"`);
}

/**
 * Validate the root viewBox and return the padding it encodes, in cells.
 *
 * The padding is then DISCARDED — see the note on `svgToCells`. Validating it
 * anyway is what makes the viewBox the thing that identifies a Pixit canvas:
 * any other extent means the file came from somewhere else.
 */
function readPaddingCells(viewBox: string | undefined): number {
  if (viewBox === undefined) fail("the <svg> has no viewBox");

  const parts = viewBox.trim().split(/[\s,]+/);
  if (parts.length !== 4 || !parts.every((part) => WHOLE_NUMBER.test(part))) {
    fail(`viewBox="${viewBox}" is not four whole numbers`);
  }

  const [minX, minY, width, height] = parts.map(Number);
  const pad = -minX;
  const symmetric = minY === minX && pad >= 0 && pad % CELL_UNITS === 0;
  if (!symmetric || width !== CANVAS_UNITS + pad * 2 || height !== width) {
    fail(
      `viewBox="${viewBox}" is not a Pixit canvas — expected "${VIEW_BOX}" or a symmetrically padded form of it`,
    );
  }

  return pad / CELL_UNITS;
}

/** Read an attribute that must be present and a whole number of user units. */
function readUnits(attributes: Attributes, name: string): number {
  const raw = attributes[name];
  if (raw === undefined) fail(`a <rect> is missing ${name}`);
  if (!WHOLE_NUMBER.test(raw)) {
    fail(`<rect> ${name}="${raw}" is not a whole number of user units`);
  }
  return Number(raw);
}

/**
 * Expand one rect into the cells it covers.
 *
 * The expansion is the whole point: `buildRects` merges a horizontal run of
 * same-colored cells into ONE rect of width N*CELL_UNITS, so a reader that
 * assumed one rect per cell would silently drop every pixel after the first of
 * each run.
 */
function paintRect(
  cells: Cells,
  attributes: Attributes,
  /** The root's own fill, which a rect with no fill of its own takes. */
  inherited: string | undefined,
): void {
  const x = readUnits(attributes, "x");
  const y = readUnits(attributes, "y");
  const width = readUnits(attributes, "width");
  const height = readUnits(attributes, "height");

  if (height !== CELL_UNITS) {
    fail(`<rect> height="${height}" — every exported rect is one cell tall`);
  }
  if (x % CELL_UNITS !== 0 || y % CELL_UNITS !== 0) {
    fail(`<rect> at (${x}, ${y}) is off the ${CELL_UNITS}-unit cell grid`);
  }
  if (width <= 0 || width % CELL_UNITS !== 0) {
    fail(`<rect> width="${width}" is not a whole number of cells`);
  }

  const col = x / CELL_UNITS;
  const row = y / CELL_UNITS;
  const run = width / CELL_UNITS;
  if (!inBounds(row, col) || col + run > GRID_SIZE) {
    fail(
      `<rect> at (${x}, ${y}) spanning ${run} cells falls outside the ${GRID_SIZE}x${GRID_SIZE} grid`,
    );
  }

  // A rect with no `fill` INHERITS the root's, which is how the writer avoids
  // repeating the dominant color on every rect. The reader has to know that or
  // it refuses the tool's own current output.
  //
  // normalizeHex also accepts 3-digit and uppercase hex, so a hand-edited
  // export still imports, and every cell lands in the stored form: lowercase,
  // 6 digits, leading # (types.ts). `fill="none"` fails here, as it should —
  // a colorless rect is not a pixel.
  const declared = attributes.fill ?? inherited ?? "";
  const color = normalizeHex(declared);
  if (color === null) {
    fail(
      attributes.fill === undefined && inherited === undefined
        ? "<rect> has no fill and the <svg> has none to inherit"
        : `<rect> fill="${declared}" is not a hex color`,
    );
  }

  for (let step = 0; step < run; step++) {
    const index = toIndex(row, col + step);
    if (cells[index] !== null) {
      fail(`two rects overlap at row ${row}, col ${col + step}`);
    }
    cells[index] = color;
  }
}

/** Index just past `</name>`, which must exist. */
function afterCloseTag(body: string, from: number, name: string): number {
  const close = body.indexOf(`</${name}>`, from);
  if (close === -1) fail(`<${name}> is never closed`);
  return close + name.length + 3;
}

/**
 * Parse an SVG back into cells — the reader behind Import in the composer
 * dock (INTERACTION.md §5).
 *
 * SCOPE (BACKLOG.md D): v1 guarantees round-tripping only what `cellsToSvg`
 * wrote. Behavior on arbitrary external SVGs is undefined, so this throws on
 * the first thing it does not recognize instead of importing what it can. A
 * half-parsed import hands the owner a drawing that is subtly missing pixels,
 * which is far worse than a refusal they can act on.
 *
 * TOLERATED SHAPE: an `<svg>` element containing only an optional `<title>`
 * and any number of `<rect>`, each self-closed or `</rect>`-closed, with
 * double-quoted attributes in any order and whitespace between elements. Root
 * attributes other than `viewBox` and `fill` — the optional `width`/`height`,
 * plus `role` and `xmlns` — are ignored: the viewBox is what identifies the
 * canvas. The root `fill` is NOT ignored; it is the colour a rect without one
 * of its own inherits, which is how the writer avoids naming the dominant
 * colour on every rect.
 *
 * PADDING IS DROPPED, deliberately. A padded export carries a negative-origin
 * viewBox while its rects stay in the unpadded 0..44 space, because padding
 * grows the viewBox instead of moving the art (constants.ts). Padding is a
 * display setting rather than part of the icon, so importing a padded export
 * yields the same 11x11 art as importing the unpadded one — which is also the
 * only reading that can round-trip, since `Cells` has nowhere to put it.
 */
/**
 * RETAINED, AND CURRENTLY UNCALLED BY THE PRODUCT (2026-08-21).
 *
 * Import used to read an SVG off disk; it now picks an icon out of the set, so
 * nothing in the UI reaches this any more. It is kept for the same reason
 * `cellsBetween` is (INTERACTION.md §1): it is the exact inverse of
 * `cellsToSvg`, its tests are what hold the export format to round-tripping its
 * own history — including files written before the fill was hoisted to the root
 * (BACKLOG.md §D2) — and the public-contribution phase needs a reader for
 * exports made somewhere else. Deleting it would cost the format spec, not just
 * a function.
 */
export function svgToCells(svg: string): Cells {
  const open = ROOT_TAG.exec(svg);
  if (open === null) fail("input has no <svg> element");

  const bodyStart = open.index + open[0].length;
  const bodyEnd = svg.lastIndexOf("</svg>");
  if (bodyEnd < bodyStart) fail("the <svg> element is never closed");

  const rootAttributes = parseAttributes(open[1] ?? "");

  // Validated for shape, then thrown away: padding is a display setting, not
  // something `Cells` can hold.
  readPaddingCells(rootAttributes.viewBox);

  /* The root's fill is what rects without one inherit. `none` is not a colour,
     so it is read as "nothing to inherit" — which is exactly what the writer
     means by it on an empty drawing. */
  const inherited =
    rootAttributes.fill === undefined || rootAttributes.fill === "none"
      ? undefined
      : rootAttributes.fill;

  const cells = createEmptyCells();
  const body = svg.slice(bodyStart, bodyEnd);
  let cursor = 0;

  while (cursor < body.length) {
    const start = body.indexOf("<", cursor);
    if (start === -1) {
      assertBlank(body.slice(cursor), "after the last element");
      break;
    }
    assertBlank(body.slice(cursor, start), "between elements");

    const end = body.indexOf(">", start);
    if (end === -1) fail("an element's tag is never terminated");

    const tag = body.slice(start + 1, end);
    const name = TAG_NAME.exec(tag)?.[0];
    if (name === undefined) fail(`unexpected markup "<${tag}>"`);

    const selfClosing = tag.trimEnd().endsWith("/");
    const attributes = tag.slice(name.length);

    if (name === "title") {
      // Title text is the icon's name, which lives on the IconDef rather than
      // in cells, so it is read past and dropped.
      cursor = selfClosing ? end + 1 : afterCloseTag(body, end + 1, name);
      continue;
    }

    if (name === "rect") {
      paintRect(cells, parseAttributes(attributes), inherited);
      if (selfClosing) {
        cursor = end + 1;
      } else {
        cursor = afterCloseTag(body, end + 1, name);
        const close = cursor - name.length - 3;
        assertBlank(body.slice(end + 1, close), "in a <rect>");
      }
      continue;
    }

    fail(
      `unsupported element <${name}> — a Pixit export holds only <title> and <rect>`,
    );
  }

  return cells;
}
