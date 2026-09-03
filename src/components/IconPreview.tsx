/**
 * Renders an icon's cells as SVG rects.
 *
 * This is PRESENTATION: it reads engine data and draws it. It holds no icon
 * logic of its own — geometry comes from engine constants, colors come off the
 * cells it is handed. Recoloring happens upstream, so this component cannot
 * tell (and does not care) whether it is drawing baked or gallery colors.
 */

import { VIEW_BOX } from "@/engine/constants";
import {
  DEFAULT_CELL_STYLE,
  layoutCells,
  type CellStyle,
} from "@/engine/render";
import type { Cells } from "@/engine/types";

type IconPreviewProps = {
  cells: Cells;
  /** Rendered px. Multiples of 8, 16 minimum. Ignored if `className` sizes it. */
  size?: number;
  /** Accessible name. Omit for decorative use. */
  title?: string;
  /**
   * How each filled cell is drawn — solid, inset with a gap, or a dot.
   * DISPLAY ONLY: `cells` are never touched, and the same setting is handed to
   * `cellsToSvg` so a copied icon matches what is on screen.
   */
  cellStyle?: CellStyle;
  className?: string;
};

export function IconPreview({
  cells,
  size = 32,
  title,
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
      viewBox={VIEW_BOX}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {nodes.map(({ key, color, shape }) =>
        shape.kind === "circle" ? (
          <circle
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill={color}
          />
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
