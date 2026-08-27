/**
 * The static icon registry. v1's set is a typed module in the repo — the
 * public gallery reads it, and the owner-only composer will write into it.
 */

export { icons, getIcon } from "./icons";
export { defineIcon, cellsFromArt } from "./authoring";
export type { ArtMap, IconSource, Palette } from "./authoring";
