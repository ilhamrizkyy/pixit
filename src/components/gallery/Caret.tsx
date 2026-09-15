"use client";

import { IconPreview } from "@/components/IconPreview";
import { getIcon } from "@/registry";

/**
 * The stepper's arrow — THE SET'S OWN `play` GLYPH, mirrored for the left.
 *
 * It was `◀` and `▶` from the mono face for one pass, and those are VECTOR
 * triangles: smooth hypotenuses, antialiased edges, sitting between two keys on
 * a page where every other edge lands on a 2px cell. On an interface that draws
 * itself out of its own icons, a borrowed glyph is the one thing that says it
 * does not believe its own set.
 *
 * This is the instinct the search field and the category chips already had —
 * `getIcon("search")` rather than somebody else's magnifier, `getIcon("play")`
 * rather than a bullet — applied to the last two glyphs on the page that were
 * still someone else's.
 *
 * MIRRORED IN CSS, NOT AUTHORED TWICE. A left-pointing triangle is the same
 * eleven rows read backwards, and a second registry entry would be a drawing
 * that can drift from the first. `scaleX(-1)` on a symmetric-by-row glyph is
 * exact — there is no lighting or shading here to come out wrong, which is the
 * thing that usually makes a mirrored asset a bad idea.
 *
 * `currentColor` throughout, so one drawing serves a key, a pressed key and a
 * disabled one, and no hex reaches a component.
 *
 * IT IS `.pixl-arrow`, NOT `.pixl-caret`, and the name matters. `.pixl-caret`
 * was already the COMPOSER'S KEYBOARD CURSOR — the cell marker that blinks on a
 * 1.15s infinite loop so it reads as a cursor rather than as a mark you drew.
 * Reusing the name here put that blink on both stepper arrows, on every render,
 * forever. A collision in a flat global stylesheet costs nothing to make and
 * shows up as a symptom nowhere near its cause.
 */

const CARET_CELLS =
  getIcon("play")?.cells.map((cell) =>
    cell === null ? null : "currentColor",
  ) ?? null;

export function Caret({ back = false }: { back?: boolean }) {
  if (CARET_CELLS === null) {
    // The registry is validated at module load, so this cannot happen in a
    // built app — but a missing glyph should degrade to a readable arrow rather
    // than to an empty button.
    return <span aria-hidden="true">{back ? "◀" : "▶"}</span>;
  }
  return (
    <span
      aria-hidden="true"
      className={back ? "pixl-arrow is-back" : "pixl-arrow"}
    >
      <IconPreview cells={CARET_CELLS} size={16} />
    </span>
  );
}
