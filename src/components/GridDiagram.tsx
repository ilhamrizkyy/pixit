import {
  CANVAS_UNITS,
  CELL_UNITS,
  GRID_SIZE,
  SAFE_AREA_MAX,
  SAFE_AREA_MIN,
  SAFE_AREA_SIZE,
  VIEW_BOX,
} from "@/engine/constants";
import { layoutCells } from "@/engine/render";
import type { Cells } from "@/engine/types";

/**
 * The 11×11 grid with its 9×9 safe area, drawn from engine constants.
 *
 * The Guide explains the grid by SHOWING it rather than describing it in a
 * box of text — and because every number comes from the engine, the diagram
 * cannot drift from the geometry it documents.
 *
 * GIVE IT `cells` AND A REAL ICON SITS IN THE SAFE AREA (2026-09-18). The Guide
 * needed the abstract version for "The grid" and a concrete one for "The safe
 * area", and drawing an actual icon inside the marked region is a better
 * argument than a second empty square: you can see the one cell of margin.
 *
 * IT IS NOT TINTED ANY MORE. The safe area was filled with
 * `--color-accent-subtle`, a pale blue left over from the era when the shell
 * had a blue accent — repointed to the ink on 2026-09-12 everywhere except
 * here, so this diagram was the only blue object left on the site. It is a step
 * of the neutral ramp now.
 */
export function GridDiagram({
  size = 240,
  cells,
  caption,
}: {
  size?: number;
  cells?: Cells;
  caption?: string;
}) {
  const lines = [];
  for (let i = 0; i <= GRID_SIZE; i++) {
    const offset = i * CELL_UNITS;
    lines.push(`M${offset} 0V${CANVAS_UNITS}`, `M0 ${offset}H${CANVAS_UNITS}`);
  }

  const safeOrigin = SAFE_AREA_MIN * CELL_UNITS;
  const safeExtent = SAFE_AREA_SIZE * CELL_UNITS;

  return (
    <figure className="m-0">
      <svg
        viewBox={VIEW_BOX}
        width={size}
        height={size}
        role="img"
        aria-label={
          cells
            ? `An icon drawn inside the ${SAFE_AREA_SIZE} by ${SAFE_AREA_SIZE} safe area of an ${GRID_SIZE} by ${GRID_SIZE} grid, with one cell of margin on every side`
            : `An ${GRID_SIZE} by ${GRID_SIZE} grid with a ${SAFE_AREA_SIZE} by ${SAFE_AREA_SIZE} safe area inset by one cell on every side`
        }
        className="max-w-full"
      >
        <rect
          x={0}
          y={0}
          width={CANVAS_UNITS}
          height={CANVAS_UNITS}
          fill="var(--color-surface)"
        />
        <rect
          x={safeOrigin}
          y={safeOrigin}
          width={safeExtent}
          height={safeExtent}
          fill="var(--color-bg)"
        />
        <path
          d={lines.join("")}
          stroke="var(--color-border)"
          strokeWidth={0.4}
          fill="none"
        />
        {/* The art under the keyline, so the region is still read as a boundary
            the drawing sits inside rather than as a box drawn over it. */}
        {cells &&
          layoutCells(cells).map(({ key, shape }) =>
            shape.kind === "circle" ? null : (
              <rect
                key={key}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill="var(--color-text)"
              />
            ),
          )}
        {/* THE KEYLINE IS FOR THE EMPTY DIAGRAM ONLY. With art in the safe area
            the drawing runs to the region's edge, so a keyline in the same ink
            lands on top of the icon and reads as nothing — and it is redundant
            besides: the margin ring around the art is already one cell of
            unlit canvas, which is the whole claim. */}
        {!cells && (
          <rect
            x={safeOrigin}
            y={safeOrigin}
            width={safeExtent}
            height={safeExtent}
            fill="none"
            stroke="var(--color-text)"
            strokeWidth={0.8}
          />
        )}
      </svg>
      <figcaption className="mt-3 font-data text-caption text-text-muted">
        {caption ??
          `${GRID_SIZE}×${GRID_SIZE} cells · safe area rows and columns ${SAFE_AREA_MIN}–${SAFE_AREA_MAX}`}
      </figcaption>
    </figure>
  );
}
