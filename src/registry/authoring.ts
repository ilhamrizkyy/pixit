/**
 * Authoring helpers for hand-written icons.
 *
 * Icons are written as 11 rows of 11 characters plus a palette mapping each
 * character to a hex. A 121-element array literal is technically the same data
 * but is unreviewable in a diff — with art maps you can see the icon in the
 * source and a changed pixel shows up as a changed character.
 *
 * `.` (and space) mean empty. Every other character must exist in the palette.
 */

import { CELL_COUNT, GRID_SIZE } from "@/engine/constants";
import { createEmptyCells, normalizeHex, toIndex } from "@/engine/grid";
import type { Cells, Category, IconDef } from "@/engine/types";

export const EMPTY_CHARS = new Set([".", " "]);

export type ArtMap = readonly string[];
export type Palette = Readonly<Record<string, string>>;

/**
 * Convert an art map to cells. Throws on malformed art — these run at module
 * load, so a bad icon fails the build rather than shipping a broken registry.
 */
export function cellsFromArt(art: ArtMap, palette: Palette): Cells {
  if (art.length !== GRID_SIZE) {
    throw new Error(
      `Icon art must have ${GRID_SIZE} rows, received ${art.length}`,
    );
  }

  const cells = createEmptyCells();

  art.forEach((row, rowIndex) => {
    if (row.length !== GRID_SIZE) {
      throw new Error(
        `Icon art row ${rowIndex} must be ${GRID_SIZE} characters, received ${row.length}`,
      );
    }

    [...row].forEach((char, colIndex) => {
      if (EMPTY_CHARS.has(char)) return;

      const hex = palette[char];
      if (hex === undefined) {
        throw new Error(
          `Icon art uses "${char}" at row ${rowIndex}, col ${colIndex} with no palette entry`,
        );
      }

      const normalized = normalizeHex(hex);
      if (normalized === null) {
        throw new Error(`Palette entry "${char}" is not a valid hex: ${hex}`);
      }

      cells[toIndex(rowIndex, colIndex)] = normalized;
    });
  });

  if (cells.length !== CELL_COUNT) {
    throw new Error(`Expected ${CELL_COUNT} cells`);
  }

  return cells;
}

/**
 * Characters an art map may use, in the order they get assigned.
 *
 * `#` first because every single-colour icon — which is every seed, per the
 * authoring rule — then reads exactly like the ones already in the file. None
 * of these need escaping inside a double-quoted string, and none collide with
 * EMPTY_CHARS.
 */
const ART_CHARS = ["#", "o", "+", "x", "*", "=", "~", "%", "@", "&"] as const;

/**
 * Cells back to an art map — the exact inverse of `cellsFromArt`.
 *
 * This is what lets a drawing made in the composer land in the registry in the
 * form the registry is actually written in: eleven readable rows, where a
 * changed pixel is a changed character in the diff. Emitting the 121-element
 * cell array instead would be the same data and unreviewable, which is the
 * whole reason art maps exist.
 *
 * Colours are numbered in the order they are first met, scanning the way the
 * grid is stored, so the same drawing always produces the same art.
 */
export function cellsToArt(cells: Cells): { art: string[]; palette: Palette } {
  const chars = new Map<string, string>();

  for (const cell of cells) {
    if (cell === null || chars.has(cell)) continue;
    const char = ART_CHARS[chars.size];
    if (char === undefined) {
      throw new Error(
        `An art map can carry ${ART_CHARS.length} colours; this drawing uses more`,
      );
    }
    chars.set(cell, char);
  }

  const art: string[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    let line = "";
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = cells[toIndex(row, col)];
      line += cell === null ? "." : (chars.get(cell) ?? ".");
    }
    art.push(line);
  }

  const palette: Record<string, string> = {};
  for (const [hex, char] of chars) palette[char] = hex;

  return { art, palette };
}

/**
 * An icon as the source text you paste into the registry.
 *
 * The composer writes to the browser; the published set is a typed module in
 * the repo (CLAUDE.md). This is the bridge, and it is deliberately a STRING
 * rather than a commit: the registry is reviewed in a diff, and an id is
 * immutable once published, so the last step before an icon becomes permanent
 * should be a human looking at it.
 */
export function toRegistryEntry(source: Omit<IconSource, "art" | "palette"> & { cells: Cells }): string {
  const { art, palette } = cellsToArt(source.cells);
  const quoted = (value: string) => JSON.stringify(value);
  const paletteText = Object.entries(palette)
    .map(([char, hex]) => `${quoted(char)}: ${quoted(hex)}`)
    .join(", ");

  return [
    "  defineIcon({",
    `    id: ${quoted(source.id)},`,
    `    name: ${quoted(source.name)},`,
    `    category: ${quoted(source.category)},`,
    `    tags: [${source.tags.map(quoted).join(", ")}],`,
    `    createdAt: ${quoted(source.createdAt)},`,
    `    palette: { ${paletteText} },`,
    "    art: [",
    ...art.map((row) => `      ${quoted(row)},`),
    "    ],",
    "  }),",
    "",
  ].join("\n");
}

/**
 * Names, ids, and tags are all kebab-case: lowercase words joined by single
 * hyphens. `arrow-right`, never `Arrow Right` or `arrowRight`.
 *
 * This is the name users see, search, and copy — matching how Lucide and
 * Phosphor present icons, and making the displayed name identical to the
 * string you would paste into code.
 */
export const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isKebabCase(value: string): boolean {
  return KEBAB_CASE.test(value);
}

/**
 * Convert arbitrary text to kebab-case. Used when the composer saves, and to
 * suggest a fix in validation errors.
 *
 * Splits camelCase before lowercasing, so "arrowRight" becomes "arrow-right"
 * rather than "arrowright" — a suggestion that silently welds words together
 * is worse than no suggestion.
 */
export function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type IconSource = {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  art: ArtMap;
  palette: Palette;
  /** ISO date. Fixed per icon so builds stay deterministic. */
  createdAt: string;
};

/**
 * Build an IconDef from an art map. `author` and `status` are fixed: v1 is
 * owner-only, so every icon is Ilham's and every icon is published.
 */
export function defineIcon(source: IconSource): IconDef {
  // Fail at module load rather than shipping an inconsistent registry.
  for (const [label, value] of [
    ["id", source.id],
    ["name", source.name],
  ] as const) {
    if (!isKebabCase(value)) {
      throw new Error(
        `Icon ${label} must be kebab-case, received "${value}" (try "${toKebabCase(value)}")`,
      );
    }
  }

  for (const tag of source.tags) {
    if (!isKebabCase(tag)) {
      throw new Error(
        `Icon "${source.id}" has a non-kebab-case tag "${tag}" (try "${toKebabCase(tag)}")`,
      );
    }
  }

  return {
    id: source.id,
    name: source.name,
    category: source.category,
    tags: source.tags,
    cells: cellsFromArt(source.art, source.palette),
    author: "ilham",
    status: "published",
    createdAt: source.createdAt,
  };
}
