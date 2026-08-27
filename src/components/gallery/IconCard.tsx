"use client";

import { IconPreview } from "@/components/IconPreview";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import type { Cells, IconDef } from "@/engine/types";

/**
 * One icon in the grid.
 *
 * The card is always square and the name is always an overlay revealed on
 * hover or keyboard focus — see `.pixl-card-name`. On touch the name is
 * reached by tapping through to the detail modal.
 *
 * The label is aria-hidden and the button carries the accessible name instead,
 * so a card announces its name once rather than twice. That also means touch
 * screen-reader users still get the name from the button itself.
 *
 * Takes `cells` separately from `icon` because the gallery may hand it
 * RECOLORED cells for display while `icon` stays the untouched registry record.
 */

type IconCardProps = {
  icon: IconDef;
  cells: Cells;
  size: number;
  padding: number;
  cellStyle?: CellStyle;
  selected: boolean;
  /** Saved in this browser only, not in the published registry. */
  local?: boolean;
  onSelect: (icon: IconDef) => void;
};

export function IconCard({
  icon,
  cells,
  size,
  padding,
  cellStyle = DEFAULT_CELL_STYLE,
  selected,
  local = false,
  onSelect,
}: IconCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(icon)}
      aria-haspopup="dialog"
      aria-label={local ? `${icon.name} (saved locally)` : icon.name}
      title={local ? `${icon.name} — saved in this browser only` : icon.name}
      className={`pixl-card group relative flex w-full flex-col items-center justify-center overflow-hidden p-3 ${
        selected ? "is-selected" : ""
      } ${
        /* Dashed into the border space the card already reserves, so a
           local-only icon is legible without a second accent colour and
           without the card changing size. */
        local && !selected ? "border-dashed border-text-faint" : ""
      }`}
    >
      {/* Fills the square, so the icon stays centred at any card size and the
          footprint never shifts as the size slider moves. */}
      <span className="flex flex-1 items-center">
        <IconPreview cells={cells} size={size} padding={padding} cellStyle={cellStyle} />
      </span>

      <span aria-hidden="true" className="pixl-card-name pointer-events-none">
        {icon.name}
      </span>
    </button>
  );
}
