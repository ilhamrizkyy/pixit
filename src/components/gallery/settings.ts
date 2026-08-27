import { galleryColorFromInput } from "@/engine/color";
import { DEFAULT_ICON_SIZE } from "@/engine/constants";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import { IDENTITY_ORIENTATION, type Orientation } from "@/engine/transform";
import type { Category } from "@/engine/types";

/**
 * Everything the gallery's Filters surface controls, as ONE object.
 *
 * Grouping them matters for the mobile sheet: it edits a draft copy and only
 * commits on Apply, which is trivial with a single object and fiddly with five
 * separate useStates.
 *
 * Search is deliberately NOT here — it stays visible outside the sheet and
 * applies live, so it is never part of a draft.
 */

export type CategoryFilter = Category | "all";

export type GallerySettings = {
  /** Raw hex field text, or null to follow the theme default. */
  colorText: string | null;
  size: number;
  /** Padding in cells. */
  padding: number;
  orientation: Orientation;
  /**
   * How each filled cell is drawn. Display only, like colour and padding —
   * stored cells never change — but exports follow it (CLAUDE.md).
   */
  cellStyle: CellStyle;
  category: CategoryFilter;
};

export const DEFAULT_SETTINGS: GallerySettings = {
  colorText: null,
  size: DEFAULT_ICON_SIZE,
  padding: 0,
  orientation: IDENTITY_ORIENTATION,
  cellStyle: DEFAULT_CELL_STYLE,
  category: "all",
};

/**
 * The color actually in effect. Never null — icons always render in exactly
 * one color, so an empty or half-typed field falls back to the theme default
 * rather than to per-icon colors.
 */
export function resolveGalleryColor(
  colorText: string | null,
  themeColor: string,
): string {
  if (colorText === null) return themeColor;
  return galleryColorFromInput(colorText) ?? themeColor;
}
