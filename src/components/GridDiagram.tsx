import {
  CANVAS_UNITS,
  CELL_UNITS,
  GRID_SIZE,
  SAFE_AREA_MAX,
  SAFE_AREA_MIN,
  SAFE_AREA_SIZE,
  VIEW_BOX,
} from "@/engine/constants";

/**
 * The 11×11 grid with its 9×9 safe area, drawn from engine constants.
 *
 * The Guide explains the grid by SHOWING it rather than describing it in a
 * box of text — and because every number comes from the engine, the diagram
 * cannot drift from the geometry it documents.
 */
export function GridDiagram({ size = 240 }: { size?: number }) {
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
        aria-label={`An ${GRID_SIZE} by ${GRID_SIZE} grid with a ${SAFE_AREA_SIZE} by ${SAFE_AREA_SIZE} safe area inset by one cell on every side`}
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
          fill="var(--color-accent-subtle)"
        />
        <path
          d={lines.join("")}
          stroke="var(--color-border)"
          strokeWidth={0.4}
          fill="none"
        />
        <rect
          x={safeOrigin}
          y={safeOrigin}
          width={safeExtent}
          height={safeExtent}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={0.8}
        />
      </svg>
      <figcaption className="mt-3 font-data text-caption text-text-muted">
        {GRID_SIZE}×{GRID_SIZE} cells · safe area rows and columns{" "}
        {SAFE_AREA_MIN}–{SAFE_AREA_MAX}
      </figcaption>
    </figure>
  );
}
