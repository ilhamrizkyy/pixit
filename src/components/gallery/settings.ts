import { galleryColorFromInput, hexToHsl, type Hsl } from "@/engine/color";
import { DEFAULT_ICON_SIZE } from "@/engine/constants";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import type { Category } from "@/engine/types";

/**
 * Everything the gallery's Display surface controls, as ONE object.
 *
 * Grouping them matters for the mobile sheet: it edits a draft copy and only
 * commits on Apply, which is trivial with a single object and fiddly with
 * separate useStates.
 *
 * Search is deliberately NOT here — it stays visible outside the sheet and
 * applies live, so it is never part of a draft.
 *
 * PADDING AND TRANSFORM WERE REMOVED 2026-08-28, with the board rebuild. They
 * were gallery-wide display settings with no home left on the panel: the body
 * now carries Colour and Size, the key rack carries Shape, and the screen's
 * header carries Search and Category. The engine keeps both capabilities —
 * `applyOrientation` and `cellsToSvg`'s `padding` are still written, tested and
 * used by the composer — so this is the gallery dropping two controls, not the
 * engine losing two operations.
 */

/**
 * The engine's vocabulary, and what a person reads.
 *
 * The engine keeps its own words. `cells`, `CellStyle` and solid / gap / dots
 * are the DATA; Fill, Inset and Round are the UI. This is the only place the
 * two meet, so the dropdown, the filter sheet and the Guide cannot drift into
 * calling the same value three different things.
 *
 * `solid` READS "FILL", NOT "SQUARE" (2026-09-13, by request). Square was
 * describing the cell's SHAPE, which is the one thing that does not change
 * between the three: every cell is square in all of them, and Round only draws
 * a circle inside one. What actually varies is how much of the cell is used —
 * filled edge to edge, inset, or inset and rounded — so Fill names the
 * difference and Square named the constant. It also stops the label colliding
 * with the word this whole register is built out of.
 *
 * The ENGINE is untouched: `solid` is still `solid` in `cells`, in exports and
 * in every stored icon. This is a display name, which is the entire reason the
 * map exists.
 */
export const SHAPE_LABELS: Record<CellStyle, string> = {
  solid: "Fill",
  gap: "Inset",
  dots: "Round",
};

export type CategoryFilter = Category | "all";

export type GallerySettings = {
  /** Raw hex field text, or null to follow the theme default. */
  colorText: string | null;
  /**
   * Where the three colour knobs are pointing.
   *
   * IT IS HELD, NOT DERIVED, and that is the whole reason it exists. Deriving
   * HSL from `colorText` looks equivalent and fails on the default: the theme
   * colour is #000000, every hue of which is the same black, so a hue knob
   * reading its own position back off the hex would snap to 0 the instant it
   * was turned. The composer hit this first and its knob suite has a test named
   * for it — "turns hue even on a GREY".
   *
   * Only meaningful once `colorText` is set. While it is null the knobs read
   * the THEME's colour instead, so they always show what is on the screen.
   */
  hsl: Hsl;
  size: number;
  /**
   * How each filled cell is drawn. Display only, like colour — stored cells
   * never change — but exports follow it (CLAUDE.md).
   */
  cellStyle: CellStyle;
  category: CategoryFilter;
};

export const DEFAULT_SETTINGS: GallerySettings = {
  colorText: null,
  // Unused while `colorText` is null — see the field's note. Black rather than
  // an arbitrary hue so the first turn of a knob starts where the screen is.
  hsl: { h: 0, s: 0, l: 0 },
  size: DEFAULT_ICON_SIZE,
  cellStyle: DEFAULT_CELL_STYLE,
  category: "all",
};

/**
 * Whether anything the mobile Filters sheet CONTAINS is off its default.
 *
 * Scoped to the sheet's own contents on purpose. The dot sits on the button
 * that opens the sheet, so it has to answer for what is behind that button —
 * the body's controls, which are Colour, Size and Shape. Shape rejoined them
 * when it stopped being a rack of keys standing on the screen's top edge, and
 * SIZE STAYS ON THE LIST even though the board shows it on a rail: below `lg`
 * that rail is not rendered, so the sheet is the only place it lives.
 *
 * CATEGORY is excluded, and always will be: the chips are on screen at all
 * times, and a dot reporting a control you can already see is noise.
 */
export function hasSheetFilters(settings: GallerySettings): boolean {
  return (
    settings.colorText !== null ||
    settings.size !== DEFAULT_SETTINGS.size ||
    settings.cellStyle !== DEFAULT_SETTINGS.cellStyle
  );
}

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

/**
 * Where the knobs point right now.
 *
 * While the field is empty the gallery is showing the THEME's colour — black in
 * light, white in dark — so the knobs show that rather than a stored position
 * nobody set. The moment a colour is chosen, the stored HSL takes over and
 * keeps hue and saturation alive through a black or a white, where the hex
 * cannot carry them.
 */
export function resolveGalleryHsl(
  settings: GallerySettings,
  themeColor: string,
): Hsl {
  return settings.colorText === null ? hexToHsl(themeColor) : settings.hsl;
}
