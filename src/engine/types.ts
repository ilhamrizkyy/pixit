/**
 * The contract between engine, registry, gallery, and composer (CLAUDE.md).
 * Pure data — no imports from React, DOM, Canvas, or WebGL, ever.
 */

/**
 * One cell's paint. A 6-digit lowercase hex, or null for empty.
 *
 * Colors are BAKED (CLAUDE.md rule 2): the literal hex the owner drew with is
 * stored here and exported as-is. There is no currentColor, no theme
 * inheritance, and no downstream recolor.
 */
export type CellColor = string | null;

/**
 * An icon's pixels: a flat row-major array of exactly CELL_COUNT (121) cells.
 * Index = row * GRID_SIZE + col.
 *
 * This array IS the icon (CLAUDE.md rule 3). SVG and PNG are render targets
 * generated from it — never the stored form.
 */
export type Cells = CellColor[];

/**
 * Fixed taxonomy. Closed union on purpose: it makes the composer's category
 * dropdown and the gallery filter exhaustive, and makes an unknown category a
 * compile error rather than a silently empty filter.
 *
 * Extending the set is a deliberate edit here plus a CATEGORIES entry.
 */
export type Category =
  "interface" | "media" | "arcade" | "system" | "communication" | "nature";

/** Display metadata for each category. Order is the order the UI shows. */
export const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: "interface", label: "Interface" },
  { id: "media", label: "Media" },
  { id: "arcade", label: "Arcade" },
  { id: "system", label: "System" },
  { id: "communication", label: "Communication" },
  { id: "nature", label: "Nature" },
] as const;

/**
 * Publication state. v1 is owner-only, so every icon ships "published";
 * "pending"/"rejected" exist for the deferred contribution + curation phase and
 * are unused today.
 */
export type IconStatus = "published" | "pending" | "rejected";

/** A single icon. The unit of storage, transfer, and rendering. */
export type IconDef = {
  /** Stable, kebab-case, unique across the registry. */
  id: string;
  name: string;
  category: Category;
  /** Free-form, lowercase kebab-case. Searched alongside `name`. */
  tags: string[];
  /** Exactly CELL_COUNT entries. Validate with `isValidCells`. */
  cells: Cells;
  /** "ilham" for all v1 icons (owner-only). */
  author: string;
  status: IconStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
};

/** A row/column pair. Origin is top-left, so row grows downward. */
export type Coords = { row: number; col: number };
