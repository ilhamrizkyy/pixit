/**
 * Renders an icon's cells as SVG rects.
 *
 * This is PRESENTATION: it reads engine data and draws it. It holds no icon
 * logic of its own — geometry comes from engine constants, colors come off the
 * cells it is handed. Recoloring happens upstream, so this component cannot
 * tell (and does not care) whether it is drawing baked or gallery colors.
 */

import {
  CANVAS_UNITS,
  CELL_UNITS,
  viewBoxWithPadding,
} from "@/engine/constants";
import { DEFAULT_CELL_STYLE, layoutCells, type CellStyle } from "@/engine/render";
import type { Cells } from "@/engine/types";

type IconPreviewProps = {
  cells: Cells;
  /** Rendered px. Multiples of 8, 16 minimum. Ignored if `className` sizes it. */
  size?: number;
  /** Accessible name. Omit for decorative use. */
  title?: string;
  /** Empty space around the art, in cells. Grows the viewBox. */
  padding?: number;
  /**
   * How each filled cell is drawn — solid, inset with a gap, or a dot.
   * DISPLAY ONLY: `cells` are never touched, and the same setting is handed to
   * `cellsToSvg` so a copied icon matches what is on screen.
   */
  cellStyle?: CellStyle;
  /**
   * Draw the cell lattice behind the art.
   *
   * It lives INSIDE this SVG rather than layering behind it, because that is
   * the only way every filled cell is guaranteed to land in exactly one grid
   * box: art and lattice share one viewBox, so no pair of sizes has to agree.
   */
  grid?: boolean;
  className?: string;
};

/**
 * The lattice, spanning the padded canvas — so padding reads as extra grid
 * boxes around the art (11×11 → 13×13 → …), which is precisely what it is.
 */
function latticePath(padding: number): string {
  const pad = Math.max(0, padding) * CELL_UNITS;
  const min = -pad;
  const max = CANVAS_UNITS + pad;
  const segments: string[] = [];
  for (let o = min; o <= max; o += CELL_UNITS) {
    segments.push(`M${o} ${min}V${max}`, `M${min} ${o}H${max}`);
  }
  return segments.join("");
}

export function IconPreview({
  cells,
  size = 32,
  title,
  padding = 0,
  grid = false,
  cellStyle = DEFAULT_CELL_STYLE,
  className,
}: IconPreviewProps) {
  // The SAME walk the SVG writer uses, so the picture on screen and the picture
  // on the clipboard are produced by one function rather than two that happen
  // to agree. They did not, before this: the writer merged horizontal runs to
  // remove anti-aliasing seams and this component drew one rect per cell.
  const nodes = layoutCells(cells, cellStyle);

  return (
    <svg
      viewBox={viewBoxWithPadding(padding)}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {/* Behind the art, and scaled with it: the lattice is a diagram of the
          grid, so a thinning hairline at small sizes is correct. */}
      {grid && (
        <path
          d={latticePath(padding)}
          stroke="var(--color-border)"
          strokeWidth={0.25}
          fill="none"
        />
      )}
      {nodes.map(({ key, color, shape }) =>
        shape.kind === "circle" ? (
          <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} fill={color} />
        ) : (
          <rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={color}
          />
        ),
      )}
    </svg>
  );
}
