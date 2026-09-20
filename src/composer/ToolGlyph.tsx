import { IconPreview } from "@/components/IconPreview";
import { cellsFromArt } from "@/registry/authoring";
import { getIcon } from "@/registry";
import type { Cells } from "@/engine/types";

/**
 * Tool glyphs.
 *
 * MOST COME FROM THE SET, AND THREE ARE DRAWN HERE (2026-09-19). The set is
 * where a tool glyph should come from — an icon set that drew its own buttons
 * with somebody else's strokes has a question to answer — but only where the
 * set actually HAS the drawing. It has `undo`, `redo` and `refresh`, which are
 * literally these operations. It has nothing for Mirror, Flip or an
 * eyedropper, and what was standing in for them was `copy` and `cursor`:
 * borrowed shapes that say something else, which is what made the caps read as
 * wrong however well they were drawn.
 *
 * THEY ARE WRITTEN AS ART MAPS, the same 11-row form the registry is written
 * in, through the same `cellsFromArt` — so a tool glyph is reviewable as a
 * picture in the diff and is made of the same cells as everything else on this
 * board. They are NOT registry entries: these are chrome on an owner-only
 * route, not icons anybody can copy out of the gallery.
 *
 * `flip-v` is `flip-h` turned 90 degrees. It is the same pair of shapes on the
 * other axis, and a second drawing would be a second thing to keep in step.
 */
export type ToolName =
  | "mirror" | "eyedropper" | "undo"
  | "flip-h" | "flip-v" | "rotate" | "redo";

/* A REAL HEX, then remapped. `cellsFromArt` validates its palette and rejects
   `currentColor` outright — correctly, since an art map describes STORED cells
   and those are always literal (CLAUDE.md rule 2). Every glyph here is recoloured
   to `currentColor` on the way out by `inked`, which is the same treatment the
   registry icons already get. */
const INK = { "#": "#000000" };

const inked = (cells: Cells): Cells =>
  cells.map((cell) => (cell === null ? null : "currentColor"));

/**
 * MIRROR — two solid shapes facing a SOLID AXIS.
 *
 * THE AXIS IS THE WHOLE DIFFERENCE FROM FLIP, and it used to be a dashed line
 * that disappeared: at 44px a cell is four pixels, and a dash is two cells on
 * and one off, so the one mark distinguishing these two glyphs was the one mark
 * too fine to see. The triangles also stop a cell short of it now, which is
 * what keeps the axis a line rather than the join between two shapes.
 *
 * BOTH HALVES SOLID, because mirror is a live aid: what you draw on one side is
 * really there on the other. Flip's far half is hollow for exactly the opposite
 * reason.
 */
const MIRROR = [
  ".....#.....",
  ".....#.....",
  ".#...#...#.",
  ".##..#..##.",
  ".###.#.###.",
  ".###.#.###.",
  ".###.#.###.",
  ".##..#..##.",
  ".#...#...#.",
  ".....#.....",
  ".....#.....",
];

/**
 * FLIP — solid one side, OUTLINED the other, which is how every drawing tool
 * has drawn this for thirty years. The difference from Mirror is the whole
 * point: a flip moves the shape across, so the far side is where it is GOING
 * rather than something also there.
 */
const FLIP = [
  "...........",
  "...........",
  ".#.......#.",
  ".##.....##.",
  ".###...#.#.",
  ".####.#..#.",
  ".###...#.#.",
  ".##.....##.",
  ".#.......#.",
  "...........",
  "...........",
];

/**
 * EYEDROPPER — the barrel on the diagonal, BULB up and to the right, tip down
 * and to the left, which is the way the instrument is actually held.
 *
 * The first draw was a uniform two-cell diagonal and read as a plain slash:
 * with nothing wider at one end there was no bulb, and a dropper without a bulb
 * is a pencil. The bulb is a solid 5x2 block now rather than a taper, because
 * this glyph is drawn at 18px — a cell and a half — and at that size a shape
 * has to be a BLOCK or it is nothing. Making the key bigger was the other way
 * to fix it and the wrong one: it is meant to be the quietest control here.
 */
const DROPPER = [
  ".....#####.",
  ".....#####.",
  "....#####..",
  "...####....",
  "..####.....",
  "..###......",
  ".###.......",
  ".###.......",
  ".##........",
  ".#.........",
  "...........",
];

const DRAWN: Partial<Record<ToolName, Cells>> = {
  mirror: inked(cellsFromArt(MIRROR, INK)),
  "flip-h": inked(cellsFromArt(FLIP, INK)),
  "flip-v": inked(cellsFromArt(FLIP, INK)),
  eyedropper: inked(cellsFromArt(DROPPER, INK)),
};

/** The ones the set already owns, under their own names. */
const FROM_SET: Partial<Record<ToolName, string>> = {
  undo: "undo",
  redo: "redo",
  rotate: "refresh",
};

const TURNED = new Set<ToolName>(["flip-v"]);

export function ToolGlyph({ name, size = 28 }: { name: ToolName; size?: number }) {
  const drawn = DRAWN[name];
  const fromSet = FROM_SET[name];
  const fromRegistry = getIcon(fromSet ?? "")?.cells;
  const cells = drawn ?? (fromRegistry && inked(fromRegistry));
  if (cells === undefined) return null;

  return (
    <span aria-hidden="true" className={TURNED.has(name) ? "rotate-90" : undefined}>
      <IconPreview cells={cells} size={size} />
    </span>
  );
}
